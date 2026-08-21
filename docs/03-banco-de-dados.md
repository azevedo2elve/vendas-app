# 03 — Banco de Dados (WatermelonDB)

## 📌 Visão geral do schema

O app usa **WatermelonDB** com adapter SQLite. O schema é definido em `src/database/schema.ts` via `appSchema`, e cada tabela tem uma classe `Model` correspondente em `src/database/models/`.

Tabelas do sistema:

| Tabela | Descrição |
|---|---|
| `clients` | Cadastro de clientes do vendedor |
| `products` | Catálogo de produtos vendáveis |
| `orders` | Ordens de venda (cabeçalho) |
| `order_items` | Itens de cada ordem (linhas do carrinho, relação N:1 com `orders` e `products`) |
| `license_control` | Estado local único do dispositivo relativo à licença de uso |

```text
clients (1) ──────< orders (N)
                       │
                       │ (1)
                       ▼
                order_items (N) >────── (1) products
```

---

## 🧾 Tabela `clients`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente pelo WatermelonDB |
| `name` | `string` | `string` | ✔️ | Nome ou razão social do cliente |
| `document` | `string` | `string` | ✔️ | CPF ou CNPJ (apenas dígitos, validado via Zod) |
| `document_type` | `string` | `'cpf' \| 'cnpj'` | ✔️ | Derivado do tamanho do documento |
| `phone` | `string` | `string` | ✔️ | Telefone/WhatsApp em formato E.164 ou nacional (ex: `+5511999998888`) |
| `address` | `string` | `string` | ⛔ | Endereço completo (opcional, texto livre) |
| `notes` | `string` | `string` | ⛔ | Observações internas do vendedor |
| `is_active` | `boolean` | `boolean` | ✔️ | Soft delete / desativação lógica |
| `created_at` | `number` (timestamp) | `Date` | ✔️ | Gerenciado automaticamente (`@date`) |
| `updated_at` | `number` (timestamp) | `Date` | ✔️ | Gerenciado automaticamente (`@date`) |

### Índices
- `document` — busca rápida por CPF/CNPJ para evitar duplicidade.
- `name` — suporte à busca indexada mencionada na Visão Geral (busca por nome do cliente).

### Model (`src/database/models/Client.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export default class Client extends Model {
  static table = 'clients';
  static associations = {
    orders: { type: 'has_many', foreignKey: 'client_id' },
  } as const;

  @field('name') name!: string;
  @field('document') document!: string;
  @field('document_type') documentType!: 'cpf' | 'cnpj';
  @field('phone') phone!: string;
  @field('address') address?: string;
  @field('notes') notes?: string;
  @field('is_active') isActive!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('orders') orders!: any;
}
```

---

## 📦 Tabela `products`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `name` | `string` | `string` | ✔️ | Nome do produto |
| `sku` | `string` | `string` | ✔️ | Código único do produto (indexado) |
| `price` | `number` | `number` | ✔️ | Preço de venda em **centavos** (BRL), evita erro de ponto flutuante |
| `unit` | `string` | `string` | ✔️ | Unidade de medida (`UN`, `KG`, `CX`, `L`, etc.) |
| `category` | `string` | `string` | ⛔ | Categoria para filtros |
| `is_active` | `boolean` | `boolean` | ✔️ | Soft delete / desativação lógica |
| `created_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |
| `updated_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |

> 💰 **Convenção de dinheiro:** todos os valores monetários (`price`, `unit_price`, `discount`, `subtotal`, `total`) são armazenados como **inteiros em centavos** (ex: R$ 19,90 → `1990`). A formatação para exibição (`R$ 19,90`) é responsabilidade exclusiva da camada de UI/PDF, nunca do banco.

### Índices
- `sku` — evita duplicidade e permite busca rápida por código.
- `name` — suporte a filtros de busca por nome mencionados na Visão Geral.

### Model (`src/database/models/Product.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Product extends Model {
  static table = 'products';

  @field('name') name!: string;
  @field('sku') sku!: string;
  @field('price') price!: number; // centavos
  @field('unit') unit!: string;
  @field('category') category?: string;
  @field('is_active') isActive!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
```

---

## 🧾 Tabela `orders`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `client_id` | `string` (FK → `clients.id`) | `string` | ✔️ | Cliente da ordem |
| `order_number` | `string` | `string` | ✔️ | Número sequencial local (ex: `#0001`) para exibição no PDF |
| `status` | `string` | `'draft' \| 'confirmed' \| 'cancelled'` | ✔️ | Estado da ordem |
| `subtotal` | `number` | `number` | ✔️ | Soma dos `subtotal` de todos os `order_items` (centavos) |
| `discount_total` | `number` | `number` | ✔️ | Soma dos descontos aplicados (centavos) |
| `total` | `number` | `number` | ✔️ | `subtotal - discount_total` (centavos) |
| `notes` | `string` | `string` | ⛔ | Observações da ordem |
| `pdf_generated_at` | `number` | `Date \| null` | ⛔ | Timestamp da última geração de PDF |
| `created_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |
| `updated_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |

### Índices
- `client_id` — listar rapidamente ordens de um cliente específico.
- `status` — filtrar ordens por estado (ex: rascunhos vs. confirmadas).

### Model (`src/database/models/Order.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';

export default class Order extends Model {
  static table = 'orders';
  static associations = {
    clients: { type: 'belongs_to', key: 'client_id' },
    order_items: { type: 'has_many', foreignKey: 'order_id' },
  } as const;

  @field('client_id') clientId!: string;
  @field('order_number') orderNumber!: string;
  @field('status') status!: 'draft' | 'confirmed' | 'cancelled';
  @field('subtotal') subtotal!: number;
  @field('discount_total') discountTotal!: number;
  @field('total') total!: number;
  @field('notes') notes?: string;
  @date('pdf_generated_at') pdfGeneratedAt?: Date;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('clients', 'client_id') client!: any;
  @children('order_items') items!: any;
}
```

---

## 🧺 Tabela `order_items`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `order_id` | `string` (FK → `orders.id`) | `string` | ✔️ | Ordem à qual o item pertence |
| `product_id` | `string` (FK → `products.id`) | `string` | ✔️ | Produto vendido |
| `product_name_snapshot` | `string` | `string` | ✔️ | Nome do produto no momento da venda (snapshot, protege histórico de alterações futuras no cadastro) |
| `unit_price_snapshot` | `number` | `number` | ✔️ | Preço unitário no momento da venda, em centavos (snapshot) |
| `quantity` | `number` | `number` | ✔️ | Quantidade vendida |
| `discount` | `number` | `number` | ✔️ | Desconto aplicado ao item, em centavos |
| `subtotal` | `number` | `number` | ✔️ | `(unit_price_snapshot * quantity) - discount` |

> 🧊 **Por que "snapshot"?** Preço e nome do produto são copiados para `order_items` no momento da venda. Isso garante que, se o vendedor alterar o preço de um produto no cadastro depois, ordens antigas continuem exibindo o valor praticado na venda — essencial para a integridade do PDF histórico.

### Índices
- `order_id` — montar o carrinho/resumo de uma ordem rapidamente.
- `product_id` — relatórios futuros de produtos mais vendidos (fora do escopo atual, mas o índice já habilita a consulta).

### Model (`src/database/models/OrderItem.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class OrderItem extends Model {
  static table = 'order_items';
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
    products: { type: 'belongs_to', key: 'product_id' },
  } as const;

  @field('order_id') orderId!: string;
  @field('product_id') productId!: string;
  @field('product_name_snapshot') productNameSnapshot!: string;
  @field('unit_price_snapshot') unitPriceSnapshot!: number;
  @field('quantity') quantity!: number;
  @field('discount') discount!: number;
  @field('subtotal') subtotal!: number;

  @relation('orders', 'order_id') order!: any;
  @relation('products', 'product_id') product!: any;
}
```

---

## 🔐 Tabela `license_control`

Tabela de **linha única** (singleton local) que guarda o estado de licenciamento do dispositivo. Ver regras completas em [docs/04-sistema-licenca.md](./04-sistema-licenca.md).

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente (mas só deve existir 1 registro) |
| `device_id` | `string` | `string` (UUID) | ✔️ | Identificador único do dispositivo, gerado na primeira execução |
| `license_expires_at` | `number` (timestamp) | `Date` | ✔️ | Data/hora de expiração da licença atual |
| `license_status` | `string` | `'active' \| 'expired' \| 'blocked'` | ✔️ | Estado corrente da licença |
| `last_opened_at` | `number` (timestamp) | `Date` | ✔️ | Último momento em que o app foi aberto (base do anti-fraude de relógio) |

### Model (`src/database/models/LicenseControl.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class LicenseControl extends Model {
  static table = 'license_control';

  @field('device_id') deviceId!: string;
  @date('license_expires_at') licenseExpiresAt!: Date;
  @field('license_status') licenseStatus!: 'active' | 'expired' | 'blocked';
  @date('last_opened_at') lastOpenedAt!: Date;
}
```

---

## 🗂️ Definição do schema (`src/database/schema.ts`)

```ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'clients',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'document', type: 'string', isIndexed: true },
        { name: 'document_type', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'price', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'order_number', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'subtotal', type: 'number' },
        { name: 'discount_total', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'pdf_generated_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'order_items',
      columns: [
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'product_name_snapshot', type: 'string' },
        { name: 'unit_price_snapshot', type: 'number' },
        { name: 'quantity', type: 'number' },
        { name: 'discount', type: 'number' },
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
  ],
});
```

## 🔁 Migrations

Toda alteração de schema (nova coluna, nova tabela) deve:
1. Incrementar `version` em `schema.ts`.
2. Adicionar um passo correspondente em `src/database/migrations.ts` usando `schemaMigrations`/`addColumns`/`createTable` do WatermelonDB.
3. **Nunca** alterar uma migration já publicada — sempre adicionar uma nova.
4. Atualizar esta tabela em `docs/03-banco-de-dados.md` refletindo o novo estado do schema (ver regra em `CLAUDE.md`).

## 📎 Documentos relacionados

- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Telas e módulos: [docs/05-modulos-telas.md](./05-modulos-telas.md)
