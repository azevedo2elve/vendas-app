import { database } from '@/database';
import Category from '@/database/models/Category';
import Client from '@/database/models/Client';
import Order from '@/database/models/Order';
import OrderItem from '@/database/models/OrderItem';
import Product from '@/database/models/Product';
import { deleteProductPhoto } from '@/services/productPhotoService';

// Ferramenta de desenvolvimento: só aparece em build de dev (`__DEV__`) ou num release gerado
// com EXPO_PUBLIC_DEV_TOOLS=true no ambiente do build (inlinado pelo Metro) — nunca no .env, pra
// não vazar num release de cliente.
export const DEV_TOOLS_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';

export type ClearAllDataResult = {
  orders: number;
  clients: number;
  products: number;
  categories: number;
};

// Apaga de vez (não soft-delete) todos os dados de negócio — pedidos, itens, clientes, produtos e
// categorias — para poder reimportar um backup do zero. Licença (`license_control`, com o
// `device_id`) e configurações da empresa ficam intactas.
export async function clearAllBusinessData(): Promise<ClearAllDataResult> {
  const [items, orders, clients, products, categories] = await Promise.all([
    database.get<OrderItem>('order_items').query().fetch(),
    database.get<Order>('orders').query().fetch(),
    database.get<Client>('clients').query().fetch(),
    database.get<Product>('products').query().fetch(),
    database.get<Category>('categories').query().fetch(),
  ]);

  await database.write(async () => {
    await database.batch(
      ...items.map((item) => item.prepareDestroyPermanently()),
      ...orders.map((order) => order.prepareDestroyPermanently()),
      ...clients.map((client) => client.prepareDestroyPermanently()),
      ...products.map((product) => product.prepareDestroyPermanently()),
      ...categories.map((category) => category.prepareDestroyPermanently())
    );
  });

  // Depois do banco: se apagar um arquivo falhar, o pior caso é uma foto órfã no armazenamento.
  await Promise.all(products.map((product) => deleteProductPhoto(product.photoPath)));

  return { orders: orders.length, clients: clients.length, products: products.length, categories: categories.length };
}
