import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Product extends Model {
  static table = 'products';

  @field('name') declare name: string;
  @field('sku') declare sku: string;
  @field('price') declare price: number;
  @field('unit') declare unit: string;

  @readonly @date('created_at') declare createdAt: Date;
}
