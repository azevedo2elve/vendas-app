import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import { Client, Product, Order, OrderItem, LicenseControl } from './models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'vendasApp',
});

export const database = new Database({
  adapter,
  modelClasses: [Client, Product, Order, OrderItem, LicenseControl],
});
