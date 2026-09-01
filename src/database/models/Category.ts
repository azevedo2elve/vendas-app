import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type Product from './Product';

export default class Category extends Model {
  static table = 'categories';

  static associations = {
    products: { type: 'has_many', foreignKey: 'category_id' },
  } as const;

  @field('name') declare name: string;

  @readonly @date('created_at') declare createdAt: Date;

  @children('products') declare products: Query<Product>;
}
