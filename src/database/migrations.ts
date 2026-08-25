import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        // Tela de Configurações (Fase 11): dados cadastrais da empresa/vendedor, usados no
        // cabeçalho de PDFs/relatórios. Tabela de linha única (mesmo padrão de `license_control`).
        createTable({
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
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
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
