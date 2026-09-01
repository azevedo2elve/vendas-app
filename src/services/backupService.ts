import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';
import { database } from '@/database';
import Client from '@/database/models/Client';
import Product from '@/database/models/Product';
import Category from '@/database/models/Category';
import Order from '@/database/models/Order';
import OrderItem from '@/database/models/OrderItem';
import type { OrderStatus, PaymentMethod } from '@/types/database';

const BACKUP_APP_VERSION = '1.0.0';

const backupClientSchema = z.object({
  name: z.string(),
  document: z.string(),
  phone: z.string(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
});

const backupCategorySchema = z.object({
  name: z.string(),
});

const backupProductSchema = z.object({
  name: z.string(),
  // Categoria referenciada por nome, não por id — um id gerado localmente não faz sentido ao
  // restaurar o backup em outro dispositivo.
  category_name: z.string().optional(),
  price: z.number(),
  unit: z.string(),
});

const backupOrderItemSchema = z.object({
  product_name_snapshot: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  discount_value: z.number(),
  subtotal: z.number(),
});

const backupOrderSchema = z.object({
  // Cliente referenciado por CPF/CNPJ, não por id — mesmo raciocínio de categoria/produto.
  client_document: z.string(),
  status: z.string(),
  total_gross: z.number(),
  discount_total: z.number(),
  total_net: z.number(),
  payment_method: z.string(),
  notes: z.string().optional(),
  order_number: z.number(),
  delivery_date: z.string().nullable().optional(),
  // Só informativo — o WatermelonDB grava `created_at` como a data da importação, não dá pra
  // restaurar a data original (campo `@readonly`, sempre "agora" na criação do registro).
  created_at: z.string(),
  items: z.array(backupOrderItemSchema),
});

const backupSchema = z.object({
  exported_at: z.string(),
  app_version: z.string(),
  clients: z.array(backupClientSchema),
  categories: z.array(backupCategorySchema),
  products: z.array(backupProductSchema),
  orders: z.array(backupOrderSchema),
});

export type BackupData = z.infer<typeof backupSchema>;

async function buildBackupData(): Promise<BackupData> {
  const [clients, categories, products, orders] = await Promise.all([
    database.get<Client>('clients').query().fetch(),
    database.get<Category>('categories').query().fetch(),
    database.get<Product>('products').query().fetch(),
    database.get<Order>('orders').query().fetch(),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const clientDocumentById = new Map(clients.map((client) => [client.id, client.document]));

  // Pedidos de clientes já excluídos (soft-delete) não têm como ser referenciados por documento
  // no backup — ficam de fora, mesma lógica de "não dá pra restaurar o que não sabemos a quem
  // pertence".
  const exportableOrders = orders.filter((order) => clientDocumentById.has(order.clientId));
  const ordersWithItems = await Promise.all(
    exportableOrders.map(async (order) => {
      const items = await order.items.fetch();
      return {
        client_document: clientDocumentById.get(order.clientId) as string,
        status: order.status,
        total_gross: order.totalGross,
        discount_total: order.discountTotal,
        total_net: order.totalNet,
        payment_method: order.paymentMethod,
        notes: order.notes,
        order_number: order.orderNumber,
        delivery_date: order.deliveryDate ? order.deliveryDate.toISOString() : null,
        created_at: order.createdAt.toISOString(),
        items: items.map((item) => ({
          product_name_snapshot: item.productNameSnapshot,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          discount_value: item.discountValue,
          subtotal: item.subtotal,
        })),
      };
    })
  );

  return {
    exported_at: new Date().toISOString(),
    app_version: BACKUP_APP_VERSION,
    clients: clients.map((client) => ({
      name: client.name,
      document: client.document,
      phone: client.phone,
      address_street: client.addressStreet,
      address_number: client.addressNumber,
      address_complement: client.addressComplement,
      address_city: client.addressCity,
      address_state: client.addressState,
      address_zip: client.addressZip,
    })),
    categories: categories.map((category) => ({ name: category.name })),
    products: products.map((product) => ({
      name: product.name,
      category_name: product.categoryId ? categoryNameById.get(product.categoryId) : undefined,
      price: product.price,
      unit: product.unit,
    })),
    orders: ordersWithItems,
  };
}

export type ExportResult = {
  file: File;
  clientsCount: number;
  productsCount: number;
  ordersCount: number;
};

function backupFileName(exportedAt: string): string {
  // HH-mm-ss no nome evita colisão ao exportar mais de uma vez no mesmo dia.
  const timePart = exportedAt.slice(11, 19).replace(/:/g, '-');
  return `vendas-app-backup-${exportedAt.slice(0, 10)}_${timePart}.json`;
}

async function writeBackupFile(directory: Directory): Promise<{ file: File; data: BackupData }> {
  const data = await buildBackupData();
  const file = directory.createFile(backupFileName(data.exported_at), 'application/json');
  file.write(JSON.stringify(data, null, 2));

  return { file, data };
}

// Escreve o backup no armazenamento privado do app e abre o menu nativo de compartilhamento
// (WhatsApp, e-mail, Drive, etc.). Em alguns emuladores/dispositivos sem um app de "Arquivos"
// instalado, o menu de compartilhamento não mostra uma opção de "salvar no aparelho" — nesse
// caso, use `saveBackupToDevice` em vez desta função.
export async function exportBackup(): Promise<ExportResult> {
  const { file, data } = await writeBackupFile(new Directory(Paths.document));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar backup de Clientes, Produtos e Ordens de Venda',
    });
  }

  return { file, clientsCount: data.clients.length, productsCount: data.products.length, ordersCount: data.orders.length };
}

// Abre o seletor de pastas do próprio sistema (Storage Access Framework no Android) e grava o
// backup diretamente ali — funciona mesmo sem nenhum app de "Arquivos" registrado para
// compartilhamento. Retorna null se o usuário cancelar a escolha da pasta.
export async function saveBackupToDevice(): Promise<ExportResult | null> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return null;
  }

  const { file, data } = await writeBackupFile(directory);
  return { file, clientsCount: data.clients.length, productsCount: data.products.length, ordersCount: data.orders.length };
}

export type BackupPreview = {
  data: BackupData;
  newClients: number;
  duplicateClients: number;
  newCategories: number;
  duplicateCategories: number;
  newProducts: number;
  duplicateProducts: number;
  newOrders: number;
  skippedOrders: number;
};

class InvalidBackupFileError extends Error {}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function orderKey(clientDocument: string, orderNumber: number): string {
  return `${clientDocument}::${orderNumber}`;
}

async function existingBackupKeys(): Promise<{
  documents: Set<string>;
  categoryNames: Set<string>;
  productNames: Set<string>;
  orderKeys: Set<string>;
}> {
  const [clients, categories, products, orders] = await Promise.all([
    database.get<Client>('clients').query().fetch(),
    database.get<Category>('categories').query().fetch(),
    database.get<Product>('products').query().fetch(),
    database.get<Order>('orders').query().fetch(),
  ]);

  const clientDocumentById = new Map(clients.map((client) => [client.id, client.document]));
  const orderKeys = new Set<string>();
  for (const order of orders) {
    const document = clientDocumentById.get(order.clientId);
    if (document) orderKeys.add(orderKey(document, order.orderNumber));
  }

  return {
    documents: new Set(clients.map((client) => client.document)),
    categoryNames: new Set(categories.map((category) => normalizeName(category.name))),
    productNames: new Set(products.map((product) => normalizeName(product.name))),
    orderKeys,
  };
}

// Abre o seletor de arquivos, lê e valida o conteúdo. Retorna null se o usuário cancelar.
export async function pickAndPreviewBackupFile(): Promise<BackupPreview | null> {
  // mimeTypes '*/*': alguns provedores de arquivo do Android reportam .json com MIME
  // inconsistente (ex: application/octet-stream); a validação real é feita no conteúdo (zod).
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) return null;

  let parsed: BackupData;
  try {
    const text = await picked.result.text();
    parsed = backupSchema.parse(JSON.parse(text));
  } catch {
    throw new InvalidBackupFileError('Arquivo inválido: não é um backup reconhecível do app.');
  }

  const { documents, categoryNames, productNames, orderKeys } = await existingBackupKeys();
  const newClients = parsed.clients.filter((client) => !documents.has(client.document)).length;
  const newCategories = parsed.categories.filter((category) => !categoryNames.has(normalizeName(category.name))).length;
  const newProducts = parsed.products.filter((product) => !productNames.has(normalizeName(product.name))).length;

  // Um pedido só é "novo" se o cliente dele existir (já localmente, ou vindo junto no mesmo
  // backup) E a combinação cliente+número do pedido ainda não existir localmente.
  const backupDocuments = new Set(parsed.clients.map((client) => client.document));
  const newOrders = parsed.orders.filter((order) => {
    const clientResolvable = documents.has(order.client_document) || backupDocuments.has(order.client_document);
    return clientResolvable && !orderKeys.has(orderKey(order.client_document, order.order_number));
  }).length;

  return {
    data: parsed,
    newClients,
    duplicateClients: parsed.clients.length - newClients,
    newCategories,
    duplicateCategories: parsed.categories.length - newCategories,
    newProducts,
    duplicateProducts: parsed.products.length - newProducts,
    newOrders,
    skippedOrders: parsed.orders.length - newOrders,
  };
}

export type ImportResult = {
  clientsImported: number;
  productsImported: number;
  ordersImported: number;
};

// Importa apenas os registros que ainda não existem localmente, para não duplicar dados ao
// importar o mesmo backup mais de uma vez: clientes por `document`, categorias e produtos por
// `name` (case-insensitive, já que produtos não têm mais um SKU único desde a Fase 12), e
// pedidos pela combinação cliente+número do pedido (`order_number` é sequencial por cliente,
// não um id global — ver docs/03).
export async function importBackup(data: BackupData): Promise<ImportResult> {
  const [existingClients, existingCategories, existingProducts, existingOrders] = await Promise.all([
    database.get<Client>('clients').query().fetch(),
    database.get<Category>('categories').query().fetch(),
    database.get<Product>('products').query().fetch(),
    database.get<Order>('orders').query().fetch(),
  ]);

  const documents = new Set(existingClients.map((client) => client.document));
  const productNames = new Set(existingProducts.map((product) => normalizeName(product.name)));

  const clientsToImport = data.clients.filter((client) => !documents.has(client.document));
  const productsToImport = data.products.filter((product) => !productNames.has(normalizeName(product.name)));

  const clientCollection = database.get<Client>('clients');
  const categoryCollection = database.get<Category>('categories');
  const productCollection = database.get<Product>('products');
  const orderCollection = database.get<Order>('orders');
  const orderItemCollection = database.get<OrderItem>('order_items');

  // Clientes novos são preparados primeiro para que seus ids (gerados localmente pelo
  // WatermelonDB assim que `prepareCreate` roda, antes mesmo do `batch` persistir) já possam
  // ser referenciados pelos pedidos abaixo, dentro do mesmo `batch`.
  const clientDocumentToId = new Map(existingClients.map((client) => [client.document, client.id]));
  const preparedClients = clientsToImport.map((client) => {
    const record = clientCollection.prepareCreate((newClient) => {
      newClient.name = client.name;
      newClient.document = client.document;
      newClient.phone = client.phone;
      newClient.addressStreet = client.address_street;
      newClient.addressNumber = client.address_number;
      newClient.addressComplement = client.address_complement;
      newClient.addressCity = client.address_city;
      newClient.addressState = client.address_state;
      newClient.addressZip = client.address_zip;
    });
    clientDocumentToId.set(client.document, record.id);
    return record;
  });

  // Mesma lógica para categorias, referenciadas pelos produtos logo abaixo.
  const categoryNameToId = new Map(existingCategories.map((category) => [normalizeName(category.name), category.id]));
  const categoryNamesToCreate = new Set(
    data.categories
      .map((category) => category.name.trim())
      .filter((name) => name && !categoryNameToId.has(normalizeName(name)))
  );
  const preparedCategories = Array.from(categoryNamesToCreate).map((name) => {
    const record = categoryCollection.prepareCreate((category) => {
      category.name = name;
    });
    categoryNameToId.set(normalizeName(name), record.id);
    return record;
  });

  // E para produtos, referenciados pelos itens de pedido logo abaixo.
  const productNameToId = new Map(existingProducts.map((product) => [normalizeName(product.name), product.id]));
  const preparedProducts = productsToImport.map((product) => {
    const categoryId = product.category_name ? categoryNameToId.get(normalizeName(product.category_name)) : undefined;
    const record = productCollection.prepareCreate((newProduct) => {
      newProduct.name = product.name;
      newProduct.categoryId = categoryId;
      newProduct.price = product.price;
      newProduct.unit = product.unit;
    });
    productNameToId.set(normalizeName(product.name), record.id);
    return record;
  });

  const existingClientDocumentById = new Map(existingClients.map((client) => [client.id, client.document]));
  const existingOrderKeys = new Set<string>();
  for (const order of existingOrders) {
    const document = existingClientDocumentById.get(order.clientId);
    if (document) existingOrderKeys.add(orderKey(document, order.orderNumber));
  }

  const ordersToImport = data.orders.filter((order) => {
    const clientId = clientDocumentToId.get(order.client_document);
    return clientId && !existingOrderKeys.has(orderKey(order.client_document, order.order_number));
  });

  const preparedOrders: OrderItem[] = [];
  const preparedOrderHeaders = ordersToImport.map((order) => {
    const clientId = clientDocumentToId.get(order.client_document) as string;
    const preparedOrder = orderCollection.prepareCreate((record) => {
      record.clientId = clientId;
      record.status = order.status as OrderStatus;
      record.totalGross = order.total_gross;
      record.discountTotal = order.discount_total;
      record.totalNet = order.total_net;
      record.paymentMethod = order.payment_method as PaymentMethod;
      record.notes = order.notes;
      record.orderNumber = order.order_number;
      record.deliveryDate = order.delivery_date ? new Date(order.delivery_date) : null;
      // `created_at` não pode ser definido aqui (@readonly) — nasce com a data da importação.
    });

    for (const item of order.items) {
      preparedOrders.push(
        orderItemCollection.prepareCreate((record) => {
          record.orderId = preparedOrder.id;
          record.productId = productNameToId.get(normalizeName(item.product_name_snapshot)) ?? '';
          record.productNameSnapshot = item.product_name_snapshot;
          record.unitPrice = item.unit_price;
          record.quantity = item.quantity;
          record.discountValue = item.discount_value;
          record.subtotal = item.subtotal;
        })
      );
    }

    return preparedOrder;
  });

  // database.batch() só pode ser chamado de dentro de um Writer (database.write) — diferente de
  // collection.create(), que já se auto-encapsula. prepareCreate() acima não precisa disso.
  await database.write(async () => {
    await database.batch(
      ...preparedClients,
      ...preparedCategories,
      ...preparedProducts,
      ...preparedOrderHeaders,
      ...preparedOrders
    );
  });

  return {
    clientsImported: preparedClients.length,
    productsImported: preparedProducts.length,
    ordersImported: preparedOrderHeaders.length,
  };
}
