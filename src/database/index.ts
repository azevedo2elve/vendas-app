import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import { Client, Product, Order, OrderItem, LicenseControl } from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'vendasApp',
});

export const database = new Database({
  adapter,
  modelClasses: [Client, Product, Order, OrderItem, LicenseControl],
});
