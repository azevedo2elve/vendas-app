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

Fluxo composto por 3 telas em sequência (stack), representando o carrinho de compras:

### 1. `NewOrderScreen` — Seleção de cliente
- Busca/seleção de cliente existente (reaproveita o componente de busca do módulo Clientes).
- Atalho "Cadastrar novo cliente" sem sair do fluxo (modal ou navegação com retorno automático).
- Avança para `OrderCartScreen` somente após cliente selecionado.

### 2. `OrderCartScreen` — Carrinho de produtos
- Busca/adiciona produtos ao carrinho (lista com busca, igual ao módulo Produtos).
- Para cada item no carrinho:
  | Campo | Regra |
  |---|---|
  | Quantidade | Inteiro positivo, stepper +/- ou input numérico |
  | Preço unitário | Herdado do produto no momento da adição (`unit_price`, em centavos) |
  | Total do item | `unit_price × quantity` (`total_price`), recalculado a cada mudança |
- Lista de itens editável (remover item, editar quantidade inline).
- Rodapé fixo com o total corrente do carrinho (soma dos `total_price`), sempre visível durante o scroll.
- **Desconto:** aplicado uma única vez, a nível da ordem inteira (`orders.discount`) na tela seguinte — não há desconto por item no schema atual ([docs/03-banco-de-dados.md](./03-banco-de-dados.md#-tabela-order_items)).

### 3. `OrderSummaryScreen` — Resumo e confirmação
- Exibe: dados do cliente, lista de itens (somente leitura), desconto da ordem, forma de pagamento (`payment_method`) e total final.
- Campo de desconto da ordem (`orders.discount`, em centavos) e seletor de forma de pagamento (`dinheiro` | `pix` | `cartao` | `boleto` | `outro`).
- Botão **"Confirmar Ordem"**:
  1. Calcula `total_amount = soma(order_items.total_price) − discount`.
  2. Persiste `orders` + `order_items` no WatermelonDB dentro de uma transação (`database.write`).
  3. Navega automaticamente para a geração do PDF.

### `OrderHistoryScreen`
- Lista ordens já confirmadas, mais recentes primeiro.
- Filtro por cliente e por período.
- Reabrir uma ordem permite gerar o PDF novamente (reenvio) sem duplicar o registro.

### Regra de cálculo (centralizada em `services/`, não na tela)

```ts
// services/orderCalculationService.ts (referência)
function calculateItemTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity; // centavos
}

function calculateOrderTotal(items: { unitPrice: number; quantity: number }[], discount: number): number {
  const itemsTotal = items.reduce((acc, i) => acc + calculateItemTotal(i.unitPrice, i.quantity), 0);
  return itemsTotal - discount;
}
```

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
