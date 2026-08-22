import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'clients',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'document', type: 'string', isIndexed: true },
        { name: 'phone', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'price', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'total_amount', type: 'number' },
        { name: 'discount', type: 'number' },
        { name: 'payment_method', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'order_items',
      columns: [
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
        { name: 'total_price', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'license_control',
      columns: [
        { name: 'device_id', type: 'string' },
        { name: 'license_expires_at', type: 'number' },
        { name: 'license_status', type: 'string' },
        { name: 'last_opened_at', type: 'number' },
      ],
    }),
  ],
});
