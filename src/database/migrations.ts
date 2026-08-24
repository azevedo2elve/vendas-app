import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        // Redesenho dos campos de `orders`/`order_items` para o módulo de Ordem de Venda
        // (Fase 4). As colunas antigas (`total_amount`, `discount` em orders; `total_price`
        // em order_items) ficam órfãs na tabela SQLite, mas não são mais lidas pelo app —
        // não havia nenhuma tela usando esses campos ainda, então não é preciso migrar dados.
        addColumns({
          table: 'orders',
          columns: [
            { name: 'total_gross', type: 'number' },
            { name: 'discount_total', type: 'number' },
            { name: 'total_net', type: 'number' },
            { name: 'notes', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'order_items',
          columns: [
            { name: 'product_name_snapshot', type: 'string' },
            { name: 'discount_value', type: 'number' },
            { name: 'subtotal', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
