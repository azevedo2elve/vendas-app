import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import Order from '@/database/models/Order';
import OrderItem from '@/database/models/OrderItem';
import type { OrderStatus, PaymentMethod } from '@/types/database';
import { cartItemSubtotal, type CartItem } from '@/types/orderDraft';

export type CreateOrderInput = {
  clientId: string;
  items: CartItem[];
  discountTotal: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  deliveryDate?: Date | null;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const totalGross = input.items.reduce((acc, item) => acc + cartItemSubtotal(item), 0);
  const totalNet = Math.max(0, totalGross - input.discountTotal);

  const orderCollection = database.get<Order>('orders');
  const orderItemCollection = database.get<OrderItem>('order_items');

  // Número sequencial do pedido específico deste cliente (1º, 2º, 3º...), não um id global —
  // usado no cabeçalho do PDF pra identificar rapidamente "qual pedido é esse, deste cliente".
  const previousOrdersCount = await orderCollection.query(Q.where('client_id', input.clientId)).fetchCount();
  const orderNumber = previousOrdersCount + 1;

  let createdOrder!: Order;

  await database.write(async () => {
    const preparedOrder = orderCollection.prepareCreate((record) => {
      record.clientId = input.clientId;
      record.status = 'pending';
      record.totalGross = totalGross;
      record.discountTotal = input.discountTotal;
      record.totalNet = totalNet;
      record.paymentMethod = input.paymentMethod;
      record.notes = input.notes?.trim() || undefined;
      record.orderNumber = orderNumber;
      record.deliveryDate = input.deliveryDate ?? null;
    });

    const preparedItems = input.items.map((item) =>
      orderItemCollection.prepareCreate((record) => {
        record.orderId = preparedOrder.id;
        record.productId = item.productId;
        record.productNameSnapshot = item.productName;
        record.unitPrice = item.unitPrice;
        record.quantity = item.quantity;
        record.discountValue = item.discountValue;
        record.subtotal = cartItemSubtotal(item);
      })
    );

    await database.batch(preparedOrder, ...preparedItems);
    createdOrder = preparedOrder;
  });

  return createdOrder;
}

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const order = await database.get<Order>('orders').find(orderId);
  await database.write(async () => {
    await order.update((record) => {
      record.status = status;
    });
  });
}

export async function deleteOrder(orderId: string): Promise<void> {
  const order = await database.get<Order>('orders').find(orderId);
  const items = await order.items.fetch();

  await database.write(async () => {
    await database.batch(
      ...items.map((item) => item.prepareMarkAsDeleted()),
      order.prepareMarkAsDeleted()
    );
  });
}

// Usado pela tela de Configurações ("Limpar pedidos de teste") — remove todas as ordens e seus
// itens, sem tocar em clients/products. Não reversível (soft-delete do WatermelonDB, mas o app
// não expõe uma tela de "lixeira" para desfazer).
export async function clearAllOrders(): Promise<number> {
  const orders = await database.get<Order>('orders').query().fetch();
  const items = await database.get<OrderItem>('order_items').query().fetch();

  await database.write(async () => {
    await database.batch(
      ...items.map((item) => item.prepareMarkAsDeleted()),
      ...orders.map((order) => order.prepareMarkAsDeleted())
    );
  });

  return orders.length;
}
