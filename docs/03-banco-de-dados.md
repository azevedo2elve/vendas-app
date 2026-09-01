# 03 — Banco de Dados (WatermelonDB)

## 📌 Visão geral do schema

O app usa **WatermelonDB 0.28** com o adapter SQLite (dispatcher JSI, resolvido automaticamente pelo Metro via `index.native.js` — sem flag adicional). O schema é definido em [src/database/schema.ts](../src/database/schema.ts) via `appSchema`, e cada tabela tem uma classe `Model` correspondente em `src/database/models/`. A instância única do banco é criada em [src/database/index.ts](../src/database/index.ts).

> ⚠️ **WatermelonDB não roda no Expo Go** (depende de código nativo). O projeto instala `expo-dev-client` — builds de desenvolvimento devem ser gerados via `expo prebuild` + `expo run:android`/`expo run:ios`, não pelo app Expo Go da loja.

Tabelas do sistema:

| Tabela | Descrição |
|---|---|
| `clients` | Cadastro de clientes do vendedor |
| `categories` | Categorias do catálogo de produtos |
| `products` | Catálogo de produtos vendáveis |
| `orders` | Ordens de venda (cabeçalho) |
| `order_items` | Itens de cada ordem (linhas do carrinho, relação N:1 com `orders` e `products`) |
| `license_control` | Estado local único do dispositivo relativo à licença de uso |
| `company_settings` | Dados cadastrais únicos da empresa/vendedor (tela de Configurações) |

```text
clients (1) ──────< orders (N)
                       │
                       │ (1)
                       ▼
                order_items (N) >────── (1) products >────── (1) categories
```

---

## 🧾 Tabela `clients`

> 🔁 **Fase 13:** a antiga coluna `address` (texto livre único) foi substituída por endereço **estruturado** (rua, número, complemento, cidade, UF, CEP) — necessário pro cabeçalho do PDF (endereço e cidade do cliente em campos separados). `address` fica órfã no SQLite em instalações existentes (mesmo padrão já usado para `sku` na Fase 12).

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente pelo WatermelonDB |
| `name` | `string` (indexado) | `string` | ✔️ | Nome ou razão social do cliente |
| `document` | `string` (indexado) | `string` | ✔️ | CPF ou CNPJ do cliente |
| `phone` | `string` | `string` | ✔️ | Telefone/WhatsApp |
| `address_street` | `string` | `string` | ⛔ | Rua/logradouro |
| `address_number` | `string` | `string` | ⛔ | Número |
| `address_complement` | `string` | `string` | ⛔ | Complemento (apto, sala, etc.) |
| `address_city` | `string` | `string` | ⛔ | Cidade |
| `address_state` | `string` | `string` | ⛔ | UF (sigla, 2 letras) |
| `address_zip` | `string` | `string` | ⛔ | CEP (sem máscara) |
| `created_at` | `number` (timestamp) | `Date` | ✔️ | Gerenciado automaticamente (`@readonly @date`) |

> 📝 Todos os campos de endereço são opcionais no schema (não bloqueiam o cadastro do cliente) — helpers de formatação em [`src/utils/address.ts`](../src/utils/address.ts) (`formatClientStreetLine`, `formatClientCityLine`, `formatClientFullAddress`) lidam com combinações parciais.

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
  @field('address_street') declare addressStreet?: string;
  @field('address_number') declare addressNumber?: string;
  @field('address_complement') declare addressComplement?: string;
  @field('address_city') declare addressCity?: string;
  @field('address_state') declare addressState?: string;
  @field('address_zip') declare addressZip?: string;

  @readonly @date('created_at') declare createdAt: Date;

  @children('orders') declare orders: Query<Order>;
}
```

---

## 🏷️ Tabela `categories`

> ✨ Adicionada na **Fase 12** (schema v3 → v4) para permitir organizar o catálogo de produtos por categoria (ex: "Bebidas", "Limpeza"). Substitui o antigo campo `sku`, removido nesta mesma fase a pedido do cliente (fluxo considerado desnecessariamente complexo para o negócio).

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `name` | `string` (indexado) | `string` | ✔️ | Nome da categoria (único, checado na tela antes de salvar) |
| `created_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |

### Model (`src/database/models/Category.ts`)

```ts
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
```

---

## 📦 Tabela `products`

> 🔁 **Fase 12:** coluna `sku` removida (o cliente não usa esse conceito — cadastro considerado simples demais para justificar SKU); coluna `category_id` adicionada, relacionando cada produto a uma `categories`.

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `name` | `string` (indexado) | `string` | ✔️ | Nome do produto |
| `category_id` | `string` (indexado, FK → `categories.id`) | `string` | ⛔ (opcional no schema, obrigatório na validação do formulário de cadastro) | Categoria do produto — opcional no schema só para não quebrar produtos já existentes de antes da Fase 12, que ficam "sem categoria" até serem editados |
| `price` | `number` | `number` | ✔️ | Preço de venda em **centavos** (BRL) |
| `unit` | `string` | `string` | ✔️ | Unidade de medida (`UN`, `KG`, `CX`, `L`, etc.) |
| `created_at` | `number` | `Date` | ✔️ | Gerenciado automaticamente |

> 💰 **Convenção de dinheiro:** todos os valores monetários (`price`, `total_amount`, `discount`, `unit_price`, `total_price`) são armazenados como **inteiros em centavos** (ex: R$ 19,90 → `1990`). A formatação para exibição é responsabilidade exclusiva da UI/PDF.
>
> 🗑️ **Coluna `sku` órfã:** em instalações que já existiam antes da Fase 12, a coluna `sku` continua fisicamente na tabela SQLite (WatermelonDB não remove colunas em migration, só adiciona — mesmo padrão já usado na Fase 5 com `total_amount`/`discount`/`total_price`), mas não é mais lida nem escrita pelo app. Instalações novas (schema aplicado direto de `schema.ts`) nunca tiveram essa coluna.

### Model (`src/database/models/Product.ts`)

```ts
import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Category from './Category';

export default class Product extends Model {
  static table = 'products';
  static associations = {
    categories: { type: 'belongs_to', key: 'category_id' },
  } as const;

  @field('name') declare name: string;
  @field('category_id') declare categoryId?: string;
  @field('price') declare price: number; // centavos
  @field('unit') declare unit: string;

  @readonly @date('created_at') declare createdAt: Date;

  @relation('categories', 'category_id') declare category: Relation<Category>;
}
```

---

## 🧾 Tabela `orders`

> 🔁 Redesenhada na **Fase 5** (schema v2 — ver [Migrations](#-migrations) abaixo). Antes da Fase 5 essa tabela existia só como esqueleto (Fase 2), sem nenhuma tela usando os campos antigos (`total_amount`/`discount`). Ganhou `order_number`/`delivery_date` na **Fase 13** (schema v4 → v5), para o cabeçalho do PDF.

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente |
| `client_id` | `string` (indexado, FK → `clients.id`) | `string` | ✔️ | Cliente da ordem |
| `status` | `string` (indexado) | `'pending' \| 'completed' \| 'cancelled'` | ✔️ | Estado da ordem (nasce `pending`) |
| `total_gross` | `number` | `number` | ✔️ | Soma dos `order_items.subtotal` (já líquido dos descontos por item, antes do desconto geral do pedido), em centavos |
| `discount_total` | `number` | `number` | ✔️ | Desconto geral do pedido (aplicado no fechamento, Passo 3), em centavos |
| `total_net` | `number` | `number` | ✔️ | `total_gross − discount_total` (nunca negativo) |
| `payment_method` | `string` | `'dinheiro' \| 'pix' \| 'boleto' \| 'cartao_credito' \| 'cartao_debito' \| 'a_prazo'` | ✔️ | Forma de pagamento combinada com o cliente |
| `notes` | `string` | `string` | ⛔ | Observações gerais do pedido (opcional) |
| `order_number` | `number` | `number` | ✔️ | Número sequencial do pedido **específico do cliente** (1º, 2º, 3º pedido daquele cliente — não um id global), calculado em `orderService.createOrder()` como `(pedidos anteriores do cliente) + 1`. Pedidos criados antes da Fase 13 têm `0` (sentinela de "legado", sem numeração) |
| `delivery_date` | `number` (timestamp) | `Date \| null` | ⛔ | Data combinada de entrega (opcional — nem todo pedido tem data definida no fechamento) |
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
  @field('status') declare status: OrderStatus;
  @field('total_gross') declare totalGross: number;
  @field('discount_total') declare discountTotal: number;
  @field('total_net') declare totalNet: number;
  @field('payment_method') declare paymentMethod: PaymentMethod;
  @field('notes') declare notes?: string;
  @field('order_number') declare orderNumber: number;

  @readonly @date('created_at') declare createdAt: Date;
  @date('delivery_date') declare deliveryDate: Date | null;

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
| `product_name_snapshot` | `string` | `string` | ✔️ | Nome do produto no momento da venda — protege o histórico se o produto for renomeado depois |
| `unit_price` | `number` | `number` | ✔️ | Preço unitário no momento da venda, em centavos (snapshot) |
| `quantity` | `number` | `number` | ✔️ | Quantidade vendida |
| `discount_value` | `number` | `number` | ✔️ | Desconto aplicado a este item, em centavos |
| `subtotal` | `number` | `number` | ✔️ | `max(0, unit_price × quantity − discount_value)` |

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
  @field('product_name_snapshot') declare productNameSnapshot: string;
  @field('unit_price') declare unitPrice: number;
  @field('quantity') declare quantity: number;
  @field('discount_value') declare discountValue: number;
  @field('subtotal') declare subtotal: number;

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

## 🏢 Tabela `company_settings`

Tabela de **linha única** (mesmo padrão de `license_control`, criada sob demanda na primeira vez que a tela de Configurações é aberta — ver `getOrCreateCompanySettings()` em `src/services/settingsService.ts`). Guarda os dados cadastrais da empresa/vendedor exibidos no cabeçalho das ordens de venda em PDF (e reservados para um futuro módulo de emissão fiscal). Adicionada na **Fase 11** (schema v2 → v3); ganhou `vendedor_nome`/`logo_base64` na **Fase 13** (schema v4 → v5).

| Coluna | Tipo (schema) | Tipo TS | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | `string` (PK, auto) | `string` | ✔️ | Gerado automaticamente (apenas 1 registro deve existir) |
| `razao_social` | `string` | `string` | ✔️ | Razão social ou nome completo do emissor |
| `nome_fantasia` | `string` | `string` | ⛔ | Nome fantasia (opcional) |
| `vendedor_nome` | `string` | `string` | ⛔ | Nome do vendedor — exibido na saudação da `HomeScreen` e no cabeçalho do PDF; tem prioridade sobre `nome_fantasia`/`razao_social` nesses dois lugares (ver `resolveDisplayName()`) |
| `document` | `string` | `string` | ✔️ (pode ficar vazio até o 1º preenchimento) | CPF ou CNPJ do emissor, sem máscara — validado com `isValidCpfOuCnpj` só quando não vazio |
| `ie` | `string` | `string` | ⛔ | Inscrição Estadual ou Municipal (texto livre, opcional) |
| `phone` | `string` | `string` | ✔️ (idem `document`) | Telefone/WhatsApp de contato comercial |
| `email` | `string` | `string` | ⛔ | E-mail comercial (opcional, validado por formato quando preenchido) |
| `address_street` / `address_number` / `address_district` / `address_city` / `address_state` / `address_zip` | `string` | `string` | ⛔ | Endereço estruturado (mesma ideia hoje replicada em `clients`, Fase 13) — colunas separadas para permitir reaproveitar cada campo isoladamente em templates futuros (PDF, NF-e) |
| `pix_key` | `string` | `string` | ⛔ | Chave PIX padrão para cobrança, exibida no resumo/PDF (texto livre — não há validação de formato, já que uma chave PIX pode ser CPF/CNPJ/e-mail/telefone/aleatória) |
| `logo_base64` | `string` | `string` | ⛔ | Logo da empresa como **data URI** (`data:image/png;base64,...`) — guardada direto no banco (não um caminho de arquivo) pra estar sempre disponível offline na hora de montar o HTML do PDF; limite de 2MB no arquivo original, aplicado em `pickCompanyLogo()` |
| `updated_at` | `number` (timestamp) | `Date` | ✔️ | Atualizado manualmente a cada `saveCompanySettings()` (não usa `@readonly`, pois o campo é regravado a cada salvamento, diferente de `created_at` nas outras tabelas) |

> 📝 Diferente de `clients.document`/`phone`, não há checagem de duplicidade aqui (é sempre 1 único registro) nem relação com outras tabelas — é um registro de configuração isolado, não uma entidade de negócio.

### Model (`src/database/models/CompanySettings.ts`)

```ts
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class CompanySettings extends Model {
  static table = 'company_settings';

  @field('razao_social') declare razaoSocial: string;
  @field('nome_fantasia') declare nomeFantasia?: string;
  @field('document') declare document: string;
  @field('ie') declare ie?: string;
  @field('phone') declare phone: string;
  @field('email') declare email?: string;
  @field('address_street') declare addressStreet?: string;
  @field('address_number') declare addressNumber?: string;
  @field('address_district') declare addressDistrict?: string;
  @field('address_city') declare addressCity?: string;
  @field('address_state') declare addressState?: string;
  @field('address_zip') declare addressZip?: string;
  @field('pix_key') declare pixKey?: string;
  @field('vendedor_nome') declare vendedorNome?: string;
  @field('logo_base64') declare logoBase64?: string;

  @date('updated_at') declare updatedAt: Date;
}
```

---

## 🗂️ Definição do schema (`src/database/schema.ts`)

```ts
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
```

> 📝 `orders` ganhou `order_number` na Fase 13 (não é mais "enxuto" nesse sentido) — ainda sem soft delete em `orders`/`order_items`. `order_items` já tem snapshot de nome/preço (`product_name_snapshot`, `unit_price`), adicionado na Fase 5. `company_settings` é a exceção com `updated_at` — ali faz sentido, pois é regravado a cada salvamento do formulário, não um `created_at` imutável.

## 🔁 Migrations

Toda alteração de schema (nova coluna, nova tabela) deve:
1. Incrementar `version` em `schema.ts`.
2. Adicionar um passo correspondente em `src/database/migrations.ts` usando `schemaMigrations`/`addColumns`/`createTable` do WatermelonDB, passado como `migrations` para o `SQLiteAdapter` em `src/database/index.ts`.
3. **Nunca** alterar uma migration já publicada — sempre adicionar uma nova.
4. Atualizar esta tabela em `docs/03-banco-de-dados.md` refletindo o novo estado do schema (ver regra em `CLAUDE.md`).

### Histórico de migrations

| Versão | O que mudou | Migration |
|---|---|---|
| 1 | Schema inicial (Fase 2): `clients`, `products`, `orders`, `order_items`, `license_control`. | — (schema inicial, sem migration) |
| 2 | Fase 5 (Ordem de Venda): `orders` ganhou `total_gross`/`discount_total`/`total_net`/`notes` (substituindo `total_amount`/`discount`, que ficam órfãos no SQLite mas não são mais lidos pelo app); `order_items` ganhou `product_name_snapshot`/`discount_value`/`subtotal` (substituindo `total_price`). Não havia nenhuma tela usando os campos antigos ainda, então não foi preciso migrar dados existentes — só `addColumns`. | `src/database/migrations.ts` |
| 3 | Fase 11 (tela de Configurações): nova tabela `company_settings` (`createTable`) — dados cadastrais da empresa/vendedor. Não afeta nenhuma tabela existente. | `src/database/migrations.ts` |
| 4 | Fase 12 (categorias de produtos): nova tabela `categories` (`createTable`); `products` ganhou `category_id` (`addColumns`, opcional). A coluna `sku` de `products` **não** é removida pela migration (WatermelonDB não suporta `removeColumns`) — fica órfã no SQLite em instalações que já existiam, mesmo padrão da coluna `total_amount` na migration da Fase 5. | `src/database/migrations.ts` |
| 5 | Fase 13 (PDF personalizado + endereço estruturado): `clients` ganhou `address_street`/`address_number`/`address_complement`/`address_city`/`address_state`/`address_zip` (`addColumns`, opcionais — `address` fica órfã, mesmo padrão do `sku`); `orders` ganhou `order_number` (obrigatório — pedidos existentes recebem `0` como sentinela de "legado") e `delivery_date` (`addColumns`, opcional); `company_settings` ganhou `vendedor_nome` e `logo_base64` (`addColumns`, opcionais). | `src/database/migrations.ts` |

```ts
// src/database/migrations.ts
import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
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
```

> 📝 Migrations mais novas entram **no topo** do array `migrations` (mesma ordem usada no exemplo oficial do WatermelonDB) — `schemaMigrations` não depende da ordem para funcionar, mas manter a mais recente primeiro facilita a leitura do histórico.

## 📎 Documentos relacionados

- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Telas e módulos: [docs/05-modulos-telas.md](./05-modulos-telas.md)
