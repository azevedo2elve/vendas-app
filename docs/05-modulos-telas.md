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

### `ClientListScreen`
- Lista todos os clientes (`is_active = true` por padrão) ordenados por nome.
- Campo de busca indexada (por `name` e `document`) com debounce de ~300ms.
- Cada item exibe: nome, telefone/WhatsApp, e um atalho rápido para "Nova Ordem" com esse cliente pré-selecionado.
- FAB (Floating Action Button) para "Novo Cliente".
- Swipe-to-delete ou botão de desativar (soft delete via `is_active = false`, nunca delete físico — preserva histórico de ordens).

### `ClientFormScreen`
- Formulário com **React Hook Form + Zod**:

```ts
const clientSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  document: z.string().refine(isValidCpfOuCnpj, 'CPF/CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().optional(),
  notes: z.string().optional(),
});
```

- Máscara dinâmica de CPF/CNPJ conforme o tamanho do documento digitado.
- Máscara de telefone com suporte a formato internacional (WhatsApp).
- Validação de duplicidade: antes de salvar, verifica se já existe cliente ativo com o mesmo `document` (query indexada).
- Botão "Salvar e criar pedido" — atalho que salva o cliente e navega direto para `NewOrderScreen` com o cliente já selecionado.

---

## 📦 Módulo Produtos

### `ProductListScreen`
- Lista produtos ativos, ordenados por nome.
- Filtros: por categoria (chips horizontais) e busca textual por nome/SKU.
- Exibe preço formatado em BRL (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`) — lembrando que o valor é armazenado em centavos no banco.
- FAB para "Novo Produto".

### `ProductFormScreen`
- Formulário com **React Hook Form + Zod**:

```ts
const productSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  sku: z.string().min(1, 'SKU obrigatório'),
  price: z.number().positive('Preço deve ser maior que zero'), // em reais na UI, convertido para centavos ao salvar
  unit: z.enum(['UN', 'KG', 'CX', 'L', 'PC']),
  category: z.string().optional(),
});
```

- Campo de preço usa input mascarado de moeda (digitação em reais, conversão para centavos apenas na gravação).
- Validação de SKU único (query indexada antes de salvar).

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

### `BackupScreen`
- **Exportar:** serializa `clients`, `products`, `orders`, `order_items` (não inclui `license_control`) em um único arquivo JSON, salvo via `expo-file-system` e oferecido para compartilhamento/salvamento.
- **Importar:** lê um arquivo JSON previamente exportado, valida estrutura (schema Zod), e faz merge/insert no WatermelonDB dentro de uma transação — com tela de confirmação mostrando quantos registros serão importados antes de efetivar.
- Sempre disponível mesmo com licença `expired` (ver [docs/04-sistema-licenca.md](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active)).

```json
{
  "exported_at": "2026-08-21T14:00:00.000Z",
  "app_version": "1.0.0",
  "clients": [ /* ... */ ],
  "products": [ /* ... */ ],
  "orders": [ /* ... */ ],
  "order_items": [ /* ... */ ]
}
```

## 📎 Documentos relacionados

- Banco de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
