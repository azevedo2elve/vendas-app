# 05 — Módulos e Telas

## 📌 Visão geral dos módulos

| Módulo | Telas principais | Depende de |
|---|---|---|
| Licença | `LicenseBlockedScreen` | `licenseService` |
| Clientes | `ClientListScreen`, `ClientFormScreen` | `clients` (WatermelonDB) |
| Produtos | `ProductListScreen`, `ProductFormScreen` | `products` (WatermelonDB) |
| Ordem de Venda | `NewOrderScreen`, `OrderCartScreen`, `OrderSummaryScreen`, `OrderHistoryScreen` | `orders`, `order_items`, `pdfService` |
| Backup | `BackupScreen` | `backupService` |

---

## 👥 Módulo Clientes

### `ClientListScreen` (`src/screens/clients/ClientListScreen.tsx`)
- Lista reativa via `withObservables` (`@nozbe/watermelondb/react`) observando `clients`, ordenada por nome (`Q.sortBy('name', Q.asc)`).
- Busca em tempo real (por `name` **ou** `document`, `Q.or` + `Q.like`) com debounce de 300ms — componente reutilizável [`SearchBar`](../src/components/SearchBar.tsx).
- Card por cliente: nome, documento formatado (`maskCpfCnpj`), telefone formatado (`maskPhone`), endereço (se houver) e um botão 💬 que abre o WhatsApp do cliente (`utils/whatsapp.ts`, via `https://wa.me/55...`).
- Toque no card → `ClientFormScreen` em modo edição. [`Fab`](../src/components/Fab.tsx) (botão flutuante "+") → `ClientFormScreen` em modo criação.
- [`EmptyState`](../src/components/EmptyState.tsx) quando não há clientes cadastrados/nenhum resultado de busca.

> 🚧 Não há soft delete via `is_active` (essa coluna não existe no schema real — ver [docs/03](./03-banco-de-dados.md#-tabela-clients)). A exclusão usa `client.markAsDeleted()`, o soft-delete nativo do WatermelonDB (marca `_status: 'deleted'` e exclui das queries automaticamente, sem apagar a linha fisicamente — preserva integridade caso já existam `orders` referenciando o cliente).

### `ClientFormScreen` (`src/screens/clients/ClientFormScreen.tsx`)
- Formulário com **React Hook Form + Zod** (schema colocado no próprio arquivo da tela):

```ts
const clientSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto'),
  document: z.string().refine(isValidCpfOuCnpj, 'CPF/CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().trim().optional(),
});
```

- Campos de CPF/CNPJ e telefone usam o componente reutilizável [`MaskedInput`](../src/components/MaskedInput.tsx) (`mask="cpfCnpj"` / `mask="phone"`), que mascara para exibição e mantém o valor em dígitos puros internamente.
- `isValidCpfOuCnpj` (`src/utils/validators.ts`) valida o dígito verificador real de CPF (11 dígitos) e CNPJ (14 dígitos) — não é só checagem de tamanho.
- Validação de duplicidade: antes de salvar (criar ou editar), consulta se já existe outro cliente com o mesmo `document` (`Q.where('document', ...)`) e bloqueia com erro no campo.
- Modo edição carrega o registro via `database.get('clients').find(id)` e usa `reset()` do React Hook Form para popular o formulário.
- Botão "Excluir cliente" (só em modo edição) com `Alert.alert` de confirmação antes de chamar `markAsDeleted()`.
- **Não implementado nesta fase:** atalho "Salvar e criar pedido" (mencionado em versões anteriores deste doc) — depende do módulo de Ordem de Venda, que é a Fase 5.

---

## 📦 Módulo Produtos

### `ProductListScreen` (`src/screens/products/ProductListScreen.tsx`)
- Lista reativa via `withObservables` observando `products`, ordenada por nome.
- Busca em tempo real por `name` **ou** `sku` (mesmo padrão `Q.or` + `Q.like` + debounce do módulo Clientes).
- Card por produto: nome, SKU, unidade de medida e preço formatado em BRL (`formatCurrencyBRL`, `src/utils/masks.ts` — `Intl`/`toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` sobre o valor em centavos).
- FAB "+" → `ProductFormScreen` em modo criação; toque no card → modo edição.

> 🚧 **Não implementado nesta fase:** filtro por categoria (chips) — a coluna `category` não existe no schema real ([docs/03](./03-banco-de-dados.md#-tabela-products)); e soft delete via `is_active`, pelo mesmo motivo do módulo Clientes (usa `markAsDeleted()`).

### `ProductFormScreen` (`src/screens/products/ProductFormScreen.tsx`)
- Formulário com **React Hook Form + Zod**:

```ts
const UNITS = ['UN', 'KG', 'CX', 'L', 'PC'] as const;

const productSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto'),
  sku: z.string().trim().min(1, 'SKU obrigatório'),
  price: z.string().refine((value) => Number(value) > 0, 'Preço deve ser maior que zero'),
  unit: z.enum(UNITS),
});
```

- Campo de preço usa `MaskedInput` com `mask="currency"`: o valor do form já trafega em **centavos** (string), evitando conversão reais↔centavos fora do componente de máscara — digitação funciona como uma calculadora (dígitos entram pela direita).
- Unidade de medida é um seletor de chips (`UN`/`KG`/`CX`/`L`/`PC`), não um `<select>`/Picker — evita dependência extra (`@react-native-picker/picker` não está instalado).
- Validação de SKU único (mesmo padrão de duplicidade do módulo Clientes) antes de criar/atualizar.
- Botão "Excluir produto" (modo edição) com confirmação via `Alert.alert` + `markAsDeleted()`.

---

## 🧩 Componentes reutilizáveis criados nesta fase

| Componente | Arquivo | Uso |
|---|---|---|
| `MaskedInput` | `src/components/MaskedInput.tsx` | Input com label + erro, com máscara opcional (`cpfCnpj`, `phone`, `currency`) |
| `SearchBar` | `src/components/SearchBar.tsx` | Busca com debounce de 300ms embutido |
| `Fab` | `src/components/Fab.tsx` | Botão flutuante "+" para criar novo registro |
| `EmptyState` | `src/components/EmptyState.tsx` | Placeholder para listas vazias |
| `PrimaryButton` | `src/components/PrimaryButton.tsx` | Botão de ação (variantes `primary`/`danger`/`outline`), com estado de loading |

Utilitários: `src/utils/masks.ts` (formatação), `src/utils/validators.ts` (dígito verificador de CPF/CNPJ), `src/utils/whatsapp.ts` (abrir conversa no WhatsApp via `wa.me`).

---

## 🛒 Módulo Ordem de Venda

Implementado na Fase 5, branch `feature/modulo-ordem-venda`. Fluxo guiado de 3 etapas (`OrderDraftNavigator`, um `Stack.Navigator` **aninhado**, registrado como a rota `NewOrder` do stack raiz) + listagem/detalhe fora do fluxo de criação.

### Estado do rascunho (`useOrderDraft`, `src/hooks/useOrderDraft.tsx`)

As 3 telas do fluxo compartilham estado via **React Context** (`OrderDraftProvider`), que envolve só o `OrderDraftNavigator` — monta zerado a cada "Nova Ordem" e desmonta (descarta o rascunho) ao sair do fluxo. Guarda `clientId`/`clientName`, a lista de itens do carrinho (`CartItem[]`, ver [`src/types/orderDraft.ts`](../src/types/orderDraft.ts)) e expõe totais computados (`useMemo`). Escolhido em vez de passar tudo via params de navegação (evita serializar um carrinho inteiro a cada navegação) e em vez de uma lib de state management externa (Context resolve bem pro escopo de 3 telas).

### 1. `OrderSelectClientScreen` — Seleção do cliente
- Lista reativa (`withObservables`) + busca por nome/documento — mesmo padrão de [`ClientListScreen`](./05-modulos-telas.md#-módulo-clientes).
- Toque num cliente → `setClient(id, name)` no contexto → avança para `OrderItems`.
- Botão "Cadastrar novo cliente": usa `navigation.getParent()` para navegar até a rota `ClientForm` do stack **raiz** (fora do fluxo aninhado) — ao voltar, o cliente novo já aparece na lista (reativa) para ser selecionado.

### 2. `OrderItemsScreen` — Catálogo e carrinho
- Uma única `FlatList` reativa do catálogo de produtos (busca por nome/SKU) — o carrinho fica no `ListHeaderComponent` (evita o warning de `VirtualizedList` aninhada de duas listas separadas).
- Toque num produto → adiciona ao carrinho (ou soma +1 na quantidade se já estiver lá).
- Cada item do carrinho: [`QuantityStepper`](../src/components/QuantityStepper.tsx) (+/-) e [`DiscountInput`](../src/components/DiscountInput.tsx) (alterna R$/%, mas sempre entrega o valor em **centavos** pro estado do carrinho — o modo % é só conveniência de digitação, calculado contra o valor bruto do item).
- Resumo em tempo real: **Total de itens** (soma das quantidades), **Subtotal** (soma de `unit_price × quantity`, sem descontos), **Total de descontos** (soma dos descontos por item) e **Total geral** (soma dos subtotais líquidos por item — vira `orders.total_gross` no Passo 3).
- Botão "Continuar" desabilitado com carrinho vazio.

### 3. `OrderReviewScreen` — Resumo e fechamento
- Mostra cliente e itens tabulados (somente leitura).
- `DiscountInput` para o **desconto geral do pedido** (`orders.discount_total`, aplicado sobre `total_gross` — depois dos descontos por item).
- Seletor de forma de pagamento em chips (`PAYMENT_METHOD_LABELS` — Dinheiro, PIX, Boleto, Cartão de Crédito, Cartão de Débito, A Prazo).
- Campo de observações gerais (`orders.notes`, opcional).
- Botão **"Salvar pedido"** → `orderService.createOrder(...)`:
  1. Calcula `total_net = max(0, total_gross − discount_total)`.
  2. Persiste `orders` + todos os `order_items` numa única transação (`database.write` + `database.batch(...)` — **atenção**: `database.batch()` só pode ser chamado de dentro de um `database.write()` nesta versão do WatermelonDB, ao contrário de `collection.create()`).
  3. Zera o rascunho (`reset()`) e navega para `OrderDetail` do pedido recém-criado, **substituindo** (`navigation.replace`, via `getParent()`) a entrada `NewOrder` no histórico — voltar não retorna ao fluxo de criação.

### `OrderListScreen` — Listagem
- Lista reativa ordenada por `created_at` desc. Filtro por status (chips: Todos/Pendente/Concluído/Cancelado) e busca por nome do cliente via `Q.on('clients', Q.where('name', Q.like(...)))` — filtra pela tabela relacionada direto na query, sem carregar tudo em memória.
- Cada card observa reativamente seu próprio cliente e contagem de itens (`withObservables(['order'], ({ order }) => ({ client: order.client.observe(), itemCount: order.items.observeCount() }))` — padrão comum do WatermelonDB para listas onde cada linha depende de uma relação).
- Exibe: ID resumido (8 primeiros caracteres do `id`), nome do cliente, data/hora (`toLocaleString('pt-BR')`), contagem de itens, status (badge colorido) e `total_net` formatado em BRL.
- FAB "+" → `NewOrder` (novo fluxo de criação).

### `OrderDetailScreen` — Detalhe
- Carrega a `Order` por id (`database.get('orders').find(orderId)`) e observa reativamente cliente + itens.
- Mostra todos os itens (com `product_name_snapshot`, não o nome atual do produto — protege o histórico), totais (`total_gross`/`discount_total`/`total_net`), forma de pagamento e observações.
- Ações (`orderService.ts`):
  - "Marcar como concluído" (só se `pending`) → `setOrderStatus(id, 'completed')`.
  - "Cancelar pedido" (se não já `cancelled`) → confirmação (`Alert.alert`) → `setOrderStatus(id, 'cancelled')`.
  - "Excluir pedido" → confirmação → `deleteOrder(id)`, que também marca todos os `order_items` associados como excluídos (`markAsDeleted`, em lote) antes do próprio pedido — evita itens órfãos.

### Cálculo de totais (`src/types/orderDraft.ts` + `src/services/orderService.ts`)

```ts
// src/types/orderDraft.ts
function cartItemLineTotal(item: CartItem): number {
  return item.unitPrice * item.quantity; // centavos, sem desconto
}

function cartItemSubtotal(item: CartItem): number {
  return Math.max(0, cartItemLineTotal(item) - item.discountValue); // líquido do desconto do item
}

// src/services/orderService.ts — createOrder()
const totalGross = items.reduce((acc, item) => acc + cartItemSubtotal(item), 0);
const totalNet = Math.max(0, totalGross - discountTotal); // discountTotal = desconto geral do pedido
```

> 🚧 **Fora do escopo desta fase:** geração de PDF (Fase 6 — `pdfService`/`templates/`) e inclusão de `orders`/`order_items` no módulo de Backup (mencionado como pendente em [docs/06](./06-changelog-tarefas.md), depende deste módulo existir — agora existe, mas a integração com `backupService.ts` ainda não foi feita).

---

## 🧾 Template do PDF (A4) — `templates/orderTemplate.ts`

O PDF é gerado a partir de uma string HTML renderizada pelo `expo-print` (`Print.printToFileAsync`). Estrutura recomendada:

```text
┌─────────────────────────────────────────────┐
│  [Cabeçalho]                                  │
│  Ordem de Venda #A1B2C3D4     Data: 21/08/2026│
│  Forma de pagamento: PIX                      │
│                                                │
│  Cliente: João da Silva                       │
│  CPF/CNPJ: 123.456.789-00                     │
│  Telefone: (11) 99999-8888                    │
│  Endereço: Rua Exemplo, 123 - São Paulo/SP    │
├─────────────────────────────────────────────┤
│  [Tabela de Itens]                            │
│  Produto        Qtd   Unit.       Total       │
│  ───────────────────────────────────────────  │
│  Produto A       2   R$10,00     R$20,00      │
│  Produto B       1   R$50,00     R$50,00      │
├─────────────────────────────────────────────┤
│  [Totais]                                     │
│  Desconto:                          R$  5,00  │
│  TOTAL:                             R$ 65,00  │
├─────────────────────────────────────────────┤
│  Documento gerado pelo app — não é NF-e       │
└─────────────────────────────────────────────┘
```

> O número exibido no cabeçalho (`#A1B2C3D4`) é derivado do `id` (WatermelonDB) da ordem — o schema v1 não tem uma coluna `order_number` sequencial dedicada (ver [docs/03-banco-de-dados.md](./03-banco-de-dados.md#-tabela-orders)). Uma numeração sequencial amigável pode ser adicionada em uma migration futura, se necessário.

### Exemplo de função geradora (referência)

```ts
// services/pdfService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildOrderHtml } from '@/templates/orderTemplate';

export async function generateAndShareOrderPdf(order: OrderWithItems): Promise<void> {
  const html = buildOrderHtml(order);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Ordem de Venda ${order.id.slice(0, 8).toUpperCase()}`,
    });
  }
}
```

- O compartilhamento usa o menu **nativo** do sistema — não há integração direta com a API do WhatsApp Business; o usuário escolhe o app de destino (WhatsApp, e-mail, Drive, etc.) no menu do sistema operacional.
- Aviso explícito no rodapé do PDF: *"Documento gerado pelo app — não possui valor fiscal (não é NF-e/NFC-e)"*, reforçando o item "Fora de escopo" da Visão Geral.

---

## 💾 Módulo Backup

### `BackupScreen` (`src/screens/backup/BackupScreen.tsx`)
- **Exportar — duas opções**, ambas geram o mesmo JSON (`vendas-app-backup-AAAA-MM-DD_HH-mm-ss.json`, via a API nova do `expo-file-system` — classes `File`/`Directory`/`Paths`, não a API legada `FileSystem.writeAsStringAsync`):
  - **"Compartilhar backup"** (`backupService.exportBackup()`): escreve o arquivo em `Paths.document` (armazenamento privado do app) e abre o menu nativo de compartilhamento (`expo-sharing`) — WhatsApp, e-mail, Drive, etc. Em alguns aparelhos/emuladores sem um app de "Arquivos" instalado, esse menu **não** mostra uma opção de "salvar no aparelho" (só apps que registram esse tipo de compartilhamento aparecem).
  - **"Salvar no dispositivo"** (`backupService.saveBackupToDevice()`): abre o seletor de pastas do próprio sistema (`Directory.pickDirectoryAsync()` — Storage Access Framework no Android) e grava o arquivo diretamente na pasta escolhida (ex: Downloads). Funciona independentemente de quais apps estão instalados — é a forma garantida de "baixar" o arquivo.
- **Importar** (`backupService.pickAndPreviewBackupFile()` + `importBackup()`): abre o seletor de arquivos nativo (`File.pickFileAsync`, também da API nova do `expo-file-system` — não usa `expo-document-picker`, redundante), valida a estrutura com Zod, e mostra uma prévia na própria tela (quantos registros são novos vs. já existentes) antes do usuário confirmar. Registros com `document`/`sku` já cadastrado são ignorados na importação — evita duplicar dados se o mesmo backup for importado mais de uma vez. Inserção em lote via `database.batch(...)` (uma única transação).
- `license_control` nunca entra no backup (é específico do dispositivo, não faz sentido restaurar em outro aparelho).

```json
{
  "exported_at": "2026-08-22T14:00:00.000Z",
  "app_version": "1.0.0",
  "clients": [
    { "name": "João da Silva", "document": "11144477735", "phone": "11987654321", "address": "Rua Exemplo, 123" }
  ],
  "products": [
    { "name": "Refrigerante 2L", "sku": "REF-2L-001", "price": 990, "unit": "UN" }
  ]
}
```

> 🚧 **Escopo desta fase:** só `clients` e `products` — `orders`/`order_items` entram no backup quando o módulo de Ordem de Venda existir (Fase 5). **Também não está** disponível com licença `expired`/`blocked` ainda: o `RootNavigator` bloqueia toda a navegação (inclusive Backup) quando a licença não está `active` — a exceção "backup sempre acessível" descrita em [docs/04](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active) ainda não foi implementada (fica para quando essa distinção de acesso for construída).

## 📎 Documentos relacionados

- Banco de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
