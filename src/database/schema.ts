import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 5,
  tables: [
    tableSchema({
      name: 'clients',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'document', type: 'string', isIndexed: true },
        { name: 'phone', type: 'string' },
        { name: 'address_street', type: 'string', isOptional: true },
        { name: 'address_number', type: 'string', isOptional: true },
        { name: 'address_complement', type: 'string', isOptional: true },
        { name: 'address_city', type: 'string', isOptional: true },
        { name: 'address_state', type: 'string', isOptional: true },
        { name: 'address_zip', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'price', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'total_gross', type: 'number' },
        { name: 'discount_total', type: 'number' },
        { name: 'total_net', type: 'number' },
        { name: 'payment_method', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'order_number', type: 'number' },
        { name: 'delivery_date', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'order_items',
      columns: [
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'product_name_snapshot', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'quantity', type: 'number' },
        { name: 'discount_value', type: 'number' },
        { name: 'subtotal', type: 'number' },
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
    tableSchema({
      name: 'company_settings',
      columns: [
        { name: 'razao_social', type: 'string' },
        { name: 'nome_fantasia', type: 'string', isOptional: true },
        { name: 'document', type: 'string' },
        { name: 'ie', type: 'string', isOptional: true },
        { name: 'phone', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'address_street', type: 'string', isOptional: true },
        { name: 'address_number', type: 'string', isOptional: true },
        { name: 'address_district', type: 'string', isOptional: true },
        { name: 'address_city', type: 'string', isOptional: true },
        { name: 'address_state', type: 'string', isOptional: true },
        { name: 'address_zip', type: 'string', isOptional: true },
        { name: 'pix_key', type: 'string', isOptional: true },
        { name: 'vendedor_nome', type: 'string', isOptional: true },
        { name: 'logo_base64', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
