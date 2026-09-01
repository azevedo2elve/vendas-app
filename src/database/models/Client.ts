import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type Order from './Order';

export default class Client extends Model {
  static table = 'clients';

  static associations = {
    orders: { type: 'has_many', foreignKey: 'client_id' },
  } as const;

  @field('name') declare name: string;
  @field('document') declare document: string;
  @field('phone') declare phone: string;
  @field('address_street') declare addressStreet?: string;
  @field('address_number') declare addressNumber?: string;
  @field('address_complement') declare addressComplement?: string;
  @field('address_city') declare addressCity?: string;
  @field('address_state') declare addressState?: string;
  @field('address_zip') declare addressZip?: string;

  @readonly @date('created_at') declare createdAt: Date;

  @children('orders') declare orders: Query<Order>;
}
