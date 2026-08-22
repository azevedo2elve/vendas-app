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
  @field('total_amount') declare totalAmount: number;
  @field('discount') declare discount: number;
  @field('payment_method') declare paymentMethod: PaymentMethod;
  @field('status') declare status: OrderStatus;

  @readonly @date('created_at') declare createdAt: Date;

  @relation('clients', 'client_id') declare client: Relation<Client>;
  @children('order_items') declare items: Query<OrderItem>;
}
