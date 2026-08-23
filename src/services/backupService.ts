import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';
import { database } from '@/database';
import Client from '@/database/models/Client';
import Product from '@/database/models/Product';

const BACKUP_APP_VERSION = '1.0.0';

const backupClientSchema = z.object({
  name: z.string(),
  document: z.string(),
  phone: z.string(),
  address: z.string().optional(),
});

const backupProductSchema = z.object({
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  unit: z.string(),
});

const backupSchema = z.object({
  exported_at: z.string(),
  app_version: z.string(),
  clients: z.array(backupClientSchema),
  products: z.array(backupProductSchema),
});

export type BackupData = z.infer<typeof backupSchema>;

async function buildBackupData(): Promise<BackupData> {
  const [clients, products] = await Promise.all([
    database.get<Client>('clients').query().fetch(),
    database.get<Product>('products').query().fetch(),
  ]);

  return {
    exported_at: new Date().toISOString(),
    app_version: BACKUP_APP_VERSION,
    clients: clients.map((client) => ({
      name: client.name,
      document: client.document,
      phone: client.phone,
      address: client.address,
    })),
    products: products.map((product) => ({
      name: product.name,
      sku: product.sku,
      price: product.price,
      unit: product.unit,
    })),
  };
}

export type ExportResult = {
  file: File;
  clientsCount: number;
  productsCount: number;
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
      dialogTitle: 'Exportar backup de Clientes e Produtos',
    });
  }

  return { file, clientsCount: data.clients.length, productsCount: data.products.length };
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
  return { file, clientsCount: data.clients.length, productsCount: data.products.length };
}

export type BackupPreview = {
  data: BackupData;
  newClients: number;
  duplicateClients: number;
  newProducts: number;
  duplicateProducts: number;
};

class InvalidBackupFileError extends Error {}

async function existingDocumentsAndSkus(): Promise<{ documents: Set<string>; skus: Set<string> }> {
  const [clients, products] = await Promise.all([
    database.get<Client>('clients').query().fetch(),
    database.get<Product>('products').query().fetch(),
  ]);
  return {
    documents: new Set(clients.map((client) => client.document)),
    skus: new Set(products.map((product) => product.sku)),
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

  const { documents, skus } = await existingDocumentsAndSkus();
  const newClients = parsed.clients.filter((client) => !documents.has(client.document)).length;
  const newProducts = parsed.products.filter((product) => !skus.has(product.sku)).length;

  return {
    data: parsed,
    newClients,
    duplicateClients: parsed.clients.length - newClients,
    newProducts,
    duplicateProducts: parsed.products.length - newProducts,
  };
}

export type ImportResult = {
  clientsImported: number;
  productsImported: number;
};

// Importa apenas os registros que ainda não existem localmente (por document/sku), para não
// duplicar dados ao importar o mesmo backup mais de uma vez.
export async function importBackup(data: BackupData): Promise<ImportResult> {
  const { documents, skus } = await existingDocumentsAndSkus();

  const clientsToImport = data.clients.filter((client) => !documents.has(client.document));
  const productsToImport = data.products.filter((product) => !skus.has(product.sku));

  const clientCollection = database.get<Client>('clients');
  const productCollection = database.get<Product>('products');

  const preparedClients = clientsToImport.map((client) =>
    clientCollection.prepareCreate((record) => {
      record.name = client.name;
      record.document = client.document;
      record.phone = client.phone;
      record.address = client.address;
    })
  );
  const preparedProducts = productsToImport.map((product) =>
    productCollection.prepareCreate((record) => {
      record.name = product.name;
      record.sku = product.sku;
      record.price = product.price;
      record.unit = product.unit;
    })
  );

  // database.batch() só pode ser chamado de dentro de um Writer (database.write) — diferente de
  // collection.create(), que já se auto-encapsula. prepareCreate() acima não precisa disso.
  await database.write(async () => {
    await database.batch(...preparedClients, ...preparedProducts);
  });

  return { clientsImported: preparedClients.length, productsImported: preparedProducts.length };
}
