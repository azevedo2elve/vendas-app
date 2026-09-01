import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Category from './Category';

export default class Product extends Model {
  static table = 'products';

  static associations = {
    categories: { type: 'belongs_to', key: 'category_id' },
  } as const;

  @field('name') declare name: string;
  @field('category_id') declare categoryId?: string;
  @field('price') declare price: number;
  @field('unit') declare unit: string;

  @readonly @date('created_at') declare createdAt: Date;

  @relation('categories', 'category_id') declare category: Relation<Category>;
}
