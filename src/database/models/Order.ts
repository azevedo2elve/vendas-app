import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import type { OrderStatus, PaymentMethod } from '@/types/database';
import type Client from './Client';
import type OrderItem from './OrderItem';

export default class Order extends Model {
  static table = 'orders';

  static associations = {
    clients: { type: 'belongs_to', key: 'client_id' },
    order_items: { type: 'has_many', foreignKey: 'order_id' },
  } as const;

  @field('client_id') declare clientId: string;
  @field('status') declare status: OrderStatus;
  @field('total_gross') declare totalGross: number;
  @field('discount_total') declare discountTotal: number;
  @field('total_net') declare totalNet: number;
  @field('payment_method') declare paymentMethod: PaymentMethod;
  @field('notes') declare notes?: string;
  // Número sequencial do pedido específico para o cliente (1º, 2º, 3º pedido daquele cliente),
  // não um identificador global. Pedidos criados antes da Fase 13 têm `0` (sentinela de "legado").
  @field('order_number') declare orderNumber: number;

  @readonly @date('created_at') declare createdAt: Date;
  @date('delivery_date') declare deliveryDate: Date | null;

  @relation('clients', 'client_id') declare client: Relation<Client>;
  @children('order_items') declare items: Query<OrderItem>;
}
