import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { database } from '@/database';
import Category from '@/database/models/Category';
import Client from '@/database/models/Client';
import LicenseControl from '@/database/models/LicenseControl';
import Order from '@/database/models/Order';
import Product from '@/database/models/Product';
import type { OrderStatus, PaymentMethod } from '@/types/database';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, supabaseStorageBaseUrl } from './api';

// Backup automático "de segurança" pro suporte, sem o vendedor precisar fazer nada: guarda só o
// catálogo de produtos e as vendas dos últimos 30 dias (não os clientes, não pedidos mais
// antigos) num bucket privado do Supabase Storage, um arquivo por dispositivo, sempre
// sobrescrito — nunca acumula histórico. Único requisito do plano gratuito do Supabase.
const REMOTE_BACKUP_BUCKET = 'device-backups';
const SALES_WINDOW_DAYS = 30;

type RemoteBackupOrderItem = {
  product_name_snapshot: string;
  unit_price: number;
  quantity: number;
  discount_value: number;
  subtotal: number;
};

type RemoteBackupOrder = {
  order_number: number;
  client_name: string;
  client_document: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  total_gross: number;
  discount_total: number;
  total_net: number;
  created_at: string;
  delivery_date: string | null;
  items: RemoteBackupOrderItem[];
};

type RemoteBackupPayload = {
  schema_version: 1;
  exported_at: string;
  device_id: string;
  sales_window_days: number;
  products: { name: string; category_name?: string; price: number; unit: string }[];
  orders: RemoteBackupOrder[];
};

function licenseCollection() {
  return database.get<LicenseControl>('license_control');
}

async function getLicenseRow(): Promise<LicenseControl | null> {
  const rows = await licenseCollection().query().fetch();
  return rows[0] ?? null;
}

async function isOnline(): Promise<boolean> {
  const netState = await NetInfo.fetch();
  return netState.isConnected === true && netState.isInternetReachable !== false;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

async function buildRemoteBackupPayload(deviceId: string): Promise<RemoteBackupPayload> {
  const windowStart = Date.now() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const [products, categories, orders] = await Promise.all([
    database.get<Product>('products').query().fetch(),
    database.get<Category>('categories').query().fetch(),
    database
      .get<Order>('orders')
      .query(Q.where('created_at', Q.gte(windowStart)))
      .fetch(),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const clientIds = [...new Set(orders.map((order) => order.clientId))];
  const clients =
    clientIds.length > 0
      ? await database
          .get<Client>('clients')
          .query(Q.where('id', Q.oneOf(clientIds)))
          .fetch()
      : [];
  const clientById = new Map(clients.map((client) => [client.id, client]));

  const orderPayloads = await Promise.all(
    orders.map(async (order) => {
      const items = await order.items.fetch();
      const client = clientById.get(order.clientId);
      return {
        order_number: order.orderNumber,
        client_name: client?.name ?? '',
        client_document: client?.document ?? '',
        status: order.status,
        payment_method: order.paymentMethod,
        total_gross: order.totalGross,
        discount_total: order.discountTotal,
        total_net: order.totalNet,
        created_at: order.createdAt.toISOString(),
        delivery_date: order.deliveryDate ? order.deliveryDate.toISOString() : null,
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
    schema_version: 1,
    exported_at: new Date().toISOString(),
    device_id: deviceId,
    sales_window_days: SALES_WINDOW_DAYS,
    products: products.map((product) => ({
      name: product.name,
      category_name: product.categoryId ? categoryNameById.get(product.categoryId) : undefined,
      price: product.price,
      unit: product.unit,
    })),
    orders: orderPayloads,
  };
}

async function uploadRemoteBackup(deviceId: string, payload: RemoteBackupPayload): Promise<void> {
  const response = await fetch(
    `${supabaseStorageBaseUrl()}/storage/v1/object/${REMOTE_BACKUP_BUCKET}/${deviceId}.json`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase Storage respondeu ${response.status}`);
  }
}

// Chamada com frequência (abertura do app, reconexão de rede, checagem periódica) — mas só faz
// algo de fato no máximo uma vez por dia local, e só quando há internet. Nunca lança erro pro
// chamador: falhas (offline, Supabase fora do ar) só significam "tenta de novo na próxima vez",
// sem travar nem avisar o vendedor — é um backup de segurança silencioso, não uma ação dele.
export async function syncRemoteBackupIfNeeded(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const license = await getLicenseRow();
  if (!license) return;

  const now = new Date();
  if (license.lastRemoteBackupAt && isSameLocalDay(license.lastRemoteBackupAt, now)) {
    return;
  }

  if (!(await isOnline())) return;

  try {
    const payload = await buildRemoteBackupPayload(license.deviceId);
    await uploadRemoteBackup(license.deviceId, payload);

    await database.write(async () => {
      await license.update((record) => {
        record.lastRemoteBackupAt = now;
      });
    });
  } catch {
    // Silencioso de propósito — ver comentário acima.
  }
}
