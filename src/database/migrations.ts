import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 6,
      steps: [
        // Foto do produto (apenas visual, nunca vai pro PDF): guarda o caminho do arquivo já
        // redimensionado/comprimido no armazenamento do próprio celular (productPhotoService),
        // não a imagem em si — mesmo padrão do logo em `company_settings`, mas em disco em vez
        // de base64 no banco, pra não pesar o SQLite com fotos.
        addColumns({
          table: 'products',
          columns: [{ name: 'photo_path', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        // Fase 13: endereço estruturado do cliente (substitui a antiga coluna `address`, que
        // fica órfã no SQLite, mesmo padrão já usado para `sku` na Fase 12), número do pedido
        // por cliente e data de entrega em `orders`, e logo/nome do vendedor em `company_settings`
        // — todos consumidos pelo novo cabeçalho do PDF.
        addColumns({
          table: 'clients',
          columns: [
            { name: 'address_street', type: 'string', isOptional: true },
            { name: 'address_number', type: 'string', isOptional: true },
            { name: 'address_complement', type: 'string', isOptional: true },
            { name: 'address_city', type: 'string', isOptional: true },
            { name: 'address_state', type: 'string', isOptional: true },
            { name: 'address_zip', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'orders',
          columns: [
            { name: 'order_number', type: 'number' },
            { name: 'delivery_date', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'company_settings',
          columns: [
            { name: 'vendedor_nome', type: 'string', isOptional: true },
            { name: 'logo_base64', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        // Categorias de produtos (Fase 12): nova tabela `categories` + `products.category_id`.
        // A coluna `sku` de `products` não é removida (WatermelonDB não suporta removeColumns) —
        // fica órfã no SQLite em instalações existentes, mesmo padrão da Fase 5.
        createTable({
          name: 'categories',
          columns: [
            { name: 'name', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
        addColumns({
          table: 'products',
          columns: [{ name: 'category_id', type: 'string', isIndexed: true, isOptional: true }],
        }),
      ],
    },
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
