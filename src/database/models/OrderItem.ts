import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type Order from './Order';
import type Product from './Product';

export default class OrderItem extends Model {
  static table = 'order_items';

  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
    products: { type: 'belongs_to', key: 'product_id' },
  } as const;

  @field('order_id') declare orderId: string;
  @field('product_id') declare productId: string;
  @field('product_name_snapshot') declare productNameSnapshot: string;
  @field('unit_price') declare unitPrice: number;
  @field('quantity') declare quantity: number;
  @field('discount_value') declare discountValue: number;
  @field('subtotal') declare subtotal: number;

  @relation('orders', 'order_id') declare order: Relation<Order>;
  @relation('products', 'product_id') declare product: Relation<Product>;
}
