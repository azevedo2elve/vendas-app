# 03 — Banco de Dados (WatermelonDB)

## 📌 Visão geral do schema

O app usa **WatermelonDB 0.28** com o adapter SQLite (dispatcher JSI, resolvido automaticamente pelo Metro via `index.native.js` — sem flag adicional). O schema é definido em [src/database/schema.ts](../src/database/schema.ts) via `appSchema`, e cada tabela tem uma classe `Model` correspondente em `src/database/models/`. A instância única do banco é criada em [src/database/index.ts](../src/database/index.ts).

> ⚠️ **WatermelonDB não roda no Expo Go** (depende de código nativo). O projeto instala `expo-dev-client` — builds de desenvolvimento devem ser gerados via `expo prebuild` + `expo run:android`/`expo run:ios`, não pelo app Expo Go da loja.

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
| `name` | `string` (indexado) | `string` | ✔️ | Nome ou razão social do cliente |
| `document` | `string` (indexado) | `string` | ✔️ | CPF ou CNPJ do cliente |
| `phone` | `string` | `string` | ✔️ | Telefone/WhatsApp |
| `address` | `string` | `string` | ⛔ | Endereço completo (opcional, texto livre) |
| `created_at` | `number` (timestamp) | `Date` | ✔️ | Gerenciado automaticamente (`@readonly @date`) |

### Model (`src/database/models/Client.ts`)

```ts
import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type Order from './Order';

export default class Client extends Model {
  static table = 'clients';
  static associations = {
    orders: { type: 'has_many', foreignKey: 'client_id' },
  } as const;

  @field('name') declare name: string;
  @field('document') declare document: string;
  @field('phone') declare phone: string;
  @field('address') declare address?: string;

  @readonly @date('created_at') declare createdAt: Date;

  @children('orders') declare orders: Query<Order>;
}
```

---

## 📦 Tabela `products`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `name` | `string` (indexado) | `string` | ✔️ | Nome do produto |
| `sku` | `string` (indexado) | `string` | ✔️ | Código do produto |
| `price` | `number` | `number` | ✔️ | Preço de venda em **centavos** (BRL) |
| `unit` | `string` | `string` | ✔️ | Unidade de medida (`UN`, `KG`, `CX`, `L`, etc.) |
| `created_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |

> 💰 **Convenção de dinheiro:** todos os valores monetários (`price`, `total_amount`, `discount`, `unit_price`, `total_price`) são armazenados como **inteiros em centavos** (ex: R$ 19,90 → `1990`). A formatação para exibição é responsabilidade exclusiva da UI/PDF.

### Model (`src/database/models/Product.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Product extends Model {
  static table = 'products';

  @field('name') declare name: string;
  @field('sku') declare sku: string;
  @field('price') declare price: number; // centavos
  @field('unit') declare unit: string;

  @readonly @date('created_at') declare createdAt: Date;
}
```

---

## 🧾 Tabela `orders`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `client_id` | `string` (indexado, FK → `clients.id`) | `string` | ✔️ | Cliente da ordem |
| `total_amount` | `number` | `number` | ✔️ | Total da ordem em centavos (soma dos itens − `discount`) |
| `discount` | `number` | `number` | ✔️ | Desconto total aplicado à ordem, em centavos |
| `payment_method` | `string` | `'dinheiro' \| 'pix' \| 'cartao' \| 'boleto' \| 'outro'` | ✔️ | Forma de pagamento combinada com o cliente |
| `status` | `string` (indexado) | `'draft' \| 'confirmed' \| 'cancelled'` | ✔️ | Estado da ordem |
| `created_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |

### Model (`src/database/models/Order.ts`)

```ts
import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import type { OrderStatus, PaymentMethod } from '@/types/database';
import type Client from './Client';
import type OrderItem from './OrderItem';

export default class Order extends Model {
  static table = 'orders';
  static associations = {
    clients: { type: 'belongs_to', key: 'client_id' },
    order_items: { type: 'has_many', foreignKey: 'order_id' },
  } as const;

  @field('client_id') declare clientId: string;
  @field('total_amount') declare totalAmount: number;
  @field('discount') declare discount: number;
  @field('payment_method') declare paymentMethod: PaymentMethod;
  @field('status') declare status: OrderStatus;

  @readonly @date('created_at') declare createdAt: Date;

  @relation('clients', 'client_id') declare client: Relation<Client>;
  @children('order_items') declare items: Query<OrderItem>;
}
```

---

## 🧺 Tabela `order_items`

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `order_id` | `string` (indexado, FK → `orders.id`) | `string` | ✔️ | Ordem à qual o item pertence |
| `product_id` | `string` (indexado, FK → `products.id`) | `string` | ✔️ | Produto vendido |
| `quantity` | `number` | `number` | ✔️ | Quantidade vendida |
| `unit_price` | `number` | `number` | ✔️ | Preço unitário no momento da venda, em centavos |
| `total_price` | `number` | `number` | ✔️ | `unit_price × quantity` (o desconto do pedido é aplicado a nível de `orders.discount`, não por item) |

### Model (`src/database/models/OrderItem.ts`)

```ts
import { Model, Relation } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type Order from './Order';
import type Product from './Product';

export default class OrderItem extends Model {
  static table = 'order_items';
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
    products: { type: 'belongs_to', key: 'product_id' },
  } as const;

  @field('order_id') declare orderId: string;
  @field('product_id') declare productId: string;
  @field('quantity') declare quantity: number;
  @field('unit_price') declare unitPrice: number;
  @field('total_price') declare totalPrice: number;

  @relation('orders', 'order_id') declare order: Relation<Order>;
  @relation('products', 'product_id') declare product: Relation<Product>;
}
```

---

## 🔐 Tabela `license_control`

Tabela de **linha única** (singleton local, criada automaticamente na primeira abertura do app) que guarda o estado de licenciamento do dispositivo. Ver regras completas em [docs/04-sistema-licenca.md](./04-sistema-licenca.md).

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente (apenas 1 registro deve existir) |
| `device_id` | `string` | `string` (UUID) | ✔️ | Identificador do dispositivo, gerado via `expo-crypto` no primeiro uso |
| `license_expires_at` | `number` (timestamp) | `Date` | ✔️ | Data/hora de expiração da licença atual |
| `license_status` | `string` | `'active' \| 'expired' \| 'blocked'` | ✔️ | Estado corrente da licença |
| `last_opened_at` | `number` (timestamp) | `Date` | ✔️ | Último momento em que o app foi aberto com sucesso (base do anti-fraude de relógio) |

### Model (`src/database/models/LicenseControl.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';
import type { LicenseStatus } from '@/types/database';

export default class LicenseControl extends Model {
  static table = 'license_control';

  @field('device_id') declare deviceId: string;
  @date('license_expires_at') declare licenseExpiresAt: Date;
  @field('license_status') declare licenseStatus: LicenseStatus;
  @date('last_opened_at') declare lastOpenedAt: Date;
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
```

> 📝 Este schema é intencionalmente enxuto (sem `order_number`, `updated_at`, soft delete ou snapshots de preço/nome). Esses campos podem ser adicionados em fases futuras — quando isso acontecer, siga o processo de migrations abaixo e atualize esta tabela.

## 🔁 Migrations

Toda alteração de schema (nova coluna, nova tabela) deve:
1. Incrementar `version` em `schema.ts` (atualmente `1`).
2. Adicionar um passo correspondente em `src/database/migrations.ts` (ainda não criado — só é necessário a partir da primeira alteração pós-v1) usando `schemaMigrations`/`addColumns`/`createTable` do WatermelonDB, e passá-lo como `migrations` para o `SQLiteAdapter` em `src/database/index.ts`.
3. **Nunca** alterar uma migration já publicada — sempre adicionar uma nova.
4. Atualizar esta tabela em `docs/03-banco-de-dados.md` refletindo o novo estado do schema (ver regra em `CLAUDE.md`).

## 📎 Documentos relacionados

- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Telas e módulos: [docs/05-modulos-telas.md](./05-modulos-telas.md)
