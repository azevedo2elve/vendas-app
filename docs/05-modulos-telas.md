# 05 — Módulos e Telas

## 📌 Visão geral dos módulos

| Módulo | Telas principais | Depende de |
|---|---|---|
| Dashboard | `HomeScreen` | `orders`/`clients` (WatermelonDB, agregados), `licenseService`, `netinfo` |
| Licença | `LicenseBlockedScreen`, `ReadOnlyBanner`, `LicenseExpiryBanner` | `licenseService`, `useLicenseGuard`, `useLicenseAccess` |
| Clientes | `ClientListScreen`, `ClientFormScreen` | `clients` (WatermelonDB) |
| Produtos | `ProductListScreen`, `ProductFormScreen`, `CategoryListScreen` | `products`, `categories` (WatermelonDB) |
| Ordem de Venda | `OrderSelectClientScreen`, `OrderItemsScreen`, `OrderReviewScreen`, `OrderSuccessScreen`, `OrderListScreen`, `OrderDetailScreen` | `orders`, `order_items`, `pdfService` |
| Backup | `BackupScreen` | `backupService` |
| Configurações | `SettingsScreen` | `settingsService`, `licenseService`, `backupService`, `orderService`, `company_settings`/`license_control` (WatermelonDB) |

---

## 🔒 Modo somente-leitura (licença `expired`) — cross-cutting, Fases 7/8

Regra completa em [docs/04](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active). Mecanismo, usado em várias telas abaixo:

- `RootNavigator` monta `LicenseAccessProvider` (`src/hooks/useLicenseAccess.tsx`) com `readOnly = status === 'expired'`, e mostra uma faixa fixa (`ReadOnlyBanner`) acima da navegação inteira quando `readOnly`.
- `useLicenseAccess()` — hook cru, só `{ readOnly }`, usado dentro de telas de formulário/detalhe pra desabilitar (`disabled={readOnly}`) os botões que escrevem dado (Salvar, Excluir, Compartilhar PDF, Concluir/Cancelar pedido, etc.), mantendo a tela navegável/visível.
- `useReadOnlyGuard()` — `{ readOnly, guard }`, usado nos **pontos de entrada de criação** (FABs, botão "Nova Venda"): `guard(acao)` só executa `acao` se não estiver em somente-leitura; senão mostra um `Alert` e não navega.
- Quando `blocked` (não `expired`), nada disso se aplica — o app inteiro fica só com `LicenseBlockedScreen`, que ganhou seu próprio botão de exportar backup direto (ver docs/04).
- **`expired` não é mais permanente (2026-09-01):** só dura o próprio dia do vencimento — virou o dia seguinte sem conseguir renovar, o `RootNavigator` escala sozinho pra `blocked` (ver [docs/04](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active)). Isso acontece via a reavaliação periódica de 5 min do `useLicenseGuard`, não só na abertura do app.
- **`LicenseExpiryBanner` (2026-09-01):** quando `status === 'active'` e o vencimento está próximo (5/2/1 dia, 2/1 hora antes), uma faixa não-bloqueante e dispensável aparece no mesmo lugar da `ReadOnlyBanner` (mutuamente exclusivas — uma é só pra quando ainda não venceu, a outra só pra depois que já venceu). Ver seção própria em [docs/04](./04-sistema-licenca.md#-aviso-de-vencimento-próximo-componentslicenseexpirybannertsx).

---

## 🏠 Dashboard — `HomeScreen` (`src/screens/HomeScreen.tsx`)

Redesenhada na Fase 10 como uma tela comercial de verdade (era um painel de diagnóstico técnico até então). `headerShown: false` no `RootNavigator` — a tela desenha seu próprio cabeçalho (respeitando `useSafeAreaInsets`).

- **Cabeçalho:** nome do vendedor/empresa em destaque (`resolveDisplayName()`, `src/services/settingsService.ts` — prioridade `company_settings.vendedor_nome` → `nome_fantasia` → `razao_social` → `"Vendas App"` como default; **Fase 13**, substituiu a saudação por horário "Bom dia"/"Boa tarde"/"Boa noite" usada até então), data por extenso, e dois indicadores de status:
  - **Conectividade**, via `useNetInfo()` (`@react-native-community/netinfo`) — exatamente **"Online"** ou **"Offline"** (2026-09-01 — antes dizia "Modo Offline Ativo"), refletindo o estado real do dispositivo (não é decorativo).
  - **Licença** — desde as Fases 7/8 já não é mais estático, e ganhou rótulos dinâmicos (2026-09-01, `licenseStatusLabel()` em `HomeScreen.tsx`): **"Licença Inválida"** (modo somente-leitura, `readOnly === true`); ou, com a licença normal (`readOnly === false`), **"Licença Válida"** com mais de 5 dias até o vencimento, e a partir daí uma contagem regressiva **dia a dia** — "Faltam 5 dias - validade", "Faltam 4 dias - validade", "Faltam 3 dias"... até **"Falta 1 dia - validade"** (singular no último dia; não pula direto de 5 pra 2 — ajuste pedido pelo usuário). `expiresAt` vem do contexto `useLicenseAccess()` (propagado pelo `RootNavigator`, atualizado a cada reavaliação de 5 min do `useLicenseGuard` — não precisa focar/sair da tela pra atualizar). A tela nunca é alcançável com `status === 'blocked'` (aí é só `LicenseBlockedScreen`).
- **Cards de resumo** (`StatCard`, 3 no total): "Vendido hoje" (soma de `total_net` das ordens não-canceladas criadas desde `00:00` do dia atual), "Pedidos emitidos" (contagem total de ordens, todos os tempos) e "Clientes cadastrados" (contagem total).
- **Ações rápidas:** um botão grande em destaque "Nova Venda" → `NewOrder`, e uma linha de 3 atalhos secundários: "Novo Cliente" (→ `ClientForm`), "Catálogo" (→ `ProductList`), "Backup" (→ `Backup`). "Nova Venda" e "Novo Cliente" passam por `useReadOnlyGuard().guard(...)` (Fases 7/8) — em modo somente-leitura, mostram um aviso em vez de navegar.
- **Últimos pedidos:** até 5 ordens mais recentes (`Q.sortBy('created_at', Q.desc), Q.take(5)`), cada uma com nome do cliente (resolvido via `order.client.fetch()` — busca pontual, não observável, porque a tela já se atualiza sozinha em cada foco), valor e `Badge` de status. Se o pedido tiver `delivery_date` definida (Fase 13), mostra uma linha extra "Entrega em dd/mm/aaaa" (ícone `cube-outline`) abaixo da data de criação — omitida quando não há data de entrega combinada. `EmptyState` quando não há nenhum pedido ainda.
- **Atualização dos dados:** `useFocusEffect` (não um observable `withObservables`) — a cada vez que a tela ganha foco (ex: voltando de uma Nova Venda), os agregados são recalculados. Também suporta pull-to-refresh (`RefreshControl`). Optou-se por essa abordagem em vez de queries observáveis porque os dados exibidos são **agregados** (somas/contagens), que o `withObservables` não resolve tão diretamente quanto uma lista simples.
- **Atalhos de módulo:** dois links de lista ("Gerenciar clientes", "Todas as ordens de venda") abaixo da seção de últimos pedidos, para quem quer ir direto às listagens completas.
- **Debug Supabase:** preservado, mas só renderiza em `__DEV__` — mesmo comportamento de antes, movido para o fim da tela.

---

## 👥 Módulo Clientes

> 🔁 **Fase 13:** endereço passou de um campo único de texto livre para **estruturado** (rua, número, complemento, cidade, UF, CEP) — necessário pro cabeçalho do PDF (endereço e cidade do cliente exibidos separadamente).

### `ClientListScreen` (`src/screens/clients/ClientListScreen.tsx`)
- Lista reativa via `withObservables` (`@nozbe/watermelondb/react`) observando `clients`, ordenada por nome (`Q.sortBy('name', Q.asc)`).
- Busca em tempo real (por `name` **ou** `document`, `Q.or` + `Q.like`) com debounce de 300ms — componente reutilizável [`SearchBar`](../src/components/SearchBar.tsx).
- Card por cliente: `Avatar` com iniciais do nome (cor determinística por hash), nome, documento formatado (`maskCpfCnpj`), telefone formatado (`maskPhone`), endereço formatado em uma linha (`formatClientFullAddress()`, `src/utils/address.ts` — combina rua/número/complemento/cidade/UF/CEP, omitindo o que estiver vazio) e um botão de ícone (`Ionicons name="logo-whatsapp"`, antes um emoji 💬 de placeholder) que abre o WhatsApp do cliente (`utils/whatsapp.ts`, via `https://wa.me/55...`).
- Toque no card → `ClientFormScreen` em modo edição (sempre permitido — é leitura). [`Fab`](../src/components/Fab.tsx) (botão flutuante "+") → `ClientFormScreen` em modo criação, passando por `useReadOnlyGuard().guard(...)` (Fases 7/8).
- [`EmptyState`](../src/components/EmptyState.tsx) quando não há clientes cadastrados/nenhum resultado de busca.

> 🚧 Não há soft delete via `is_active` (essa coluna não existe no schema real — ver [docs/03](./03-banco-de-dados.md#-tabela-clients)). A exclusão usa `client.markAsDeleted()`, o soft-delete nativo do WatermelonDB (marca `_status: 'deleted'` e exclui das queries automaticamente, sem apagar a linha fisicamente — preserva integridade caso já existam `orders` referenciando o cliente).

### `ClientFormScreen` (`src/screens/clients/ClientFormScreen.tsx`)
- Formulário com **React Hook Form + Zod** (schema colocado no próprio arquivo da tela):

```ts
const clientSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto'),
  document: z.string().refine(isValidCpfOuCnpj, 'CPF/CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  addressStreet: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressComplement: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().max(2, 'Use a sigla (UF)').optional(),
  addressZip: z.string().optional(),
});
```

- Campos de CPF/CNPJ e telefone usam o componente reutilizável [`MaskedInput`](../src/components/MaskedInput.tsx) (`mask="cpfCnpj"` / `mask="phone"`), que mascara para exibição e mantém o valor em dígitos puros internamente.
- **Endereço (Fase 13):** os mesmos 6 campos estruturados já usados em "Dados da Empresa" nas Configurações (rua, número, complemento, cidade, UF, CEP — `mask="cep"`), todos opcionais.
- `isValidCpfOuCnpj` (`src/utils/validators.ts`) valida o dígito verificador real de CPF (11 dígitos) e CNPJ (14 dígitos) — não é só checagem de tamanho.
- Validação de duplicidade: antes de salvar (criar ou editar), consulta se já existe outro cliente com o mesmo `document` (`Q.where('document', ...)`) e bloqueia com erro no campo.
- Modo edição carrega o registro via `database.get('clients').find(id)` e usa `reset()` do React Hook Form para popular o formulário.
- Botão "Excluir cliente" (só em modo edição) com `Alert.alert` de confirmação antes de chamar `markAsDeleted()`.
- **Modo somente-leitura (Fases 7/8):** botões "Salvar"/"Excluir cliente" ficam `disabled` quando `useLicenseAccess().readOnly`, com um aviso acima deles — os campos continuam visíveis (o cliente pode ser consultado normalmente), só não dá pra persistir mudanças.
- **Não implementado nesta fase:** atalho "Salvar e criar pedido" (mencionado em versões anteriores deste doc) — depende do módulo de Ordem de Venda, que é a Fase 5.

---

## 📦 Módulo Produtos

> 🔁 **Fase 12:** SKU removido (o cliente não usa esse conceito); em troca, produtos agora pertencem a uma **categoria**, com tela própria de gestão (`CategoryListScreen`) e filtro por categoria no catálogo.

### `ProductListScreen` (`src/screens/products/ProductListScreen.tsx`)
- Lista reativa via `withObservables` observando **duas** coleções simultaneamente: `products` (filtrados por busca + categoria selecionada) e `categories` (todas, ordenadas por nome — usada tanto para montar os chips de filtro quanto para resolver o nome da categoria de cada produto via um `Map<id, name>` local, sem precisar de um fetch assíncrono por card).
- Busca em tempo real por `name` (antes incluía `sku`, removido nesta fase) — mesmo padrão `Q.like` + debounce do módulo Clientes.
- **Filtro por categoria:** linha de `Chip`s roláveis horizontalmente abaixo da busca — "Todas" + uma por categoria cadastrada. Selecionar uma categoria adiciona `Q.where('category_id', categoryId)` à query observada. Some da tela quando não há nenhuma categoria cadastrada ainda.
- Ícone de pasta no cabeçalho da lista → `CategoryListScreen` (gestão de categorias).
- Card por produto: nome, nome da categoria (ou "Sem categoria" — produtos cadastrados antes da Fase 12 podem não ter uma), unidade de medida e preço formatado em BRL (`formatCurrencyBRL`).
- FAB "+" → `ProductFormScreen` em modo criação (via `useReadOnlyGuard().guard(...)`, Fases 7/8); toque no card → modo edição (sempre permitido).

> 🚧 Soft delete via `is_active` não implementado, mesmo motivo do módulo Clientes (usa `markAsDeleted()`).

### `ProductFormScreen` (`src/screens/products/ProductFormScreen.tsx`)
- Formulário com **React Hook Form + Zod**:

```ts
const UNITS = ['UN', 'KG', 'CX', 'L', 'PC'] as const;

const productSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  price: z.string().refine((value) => Number(value) > 0, 'Preço deve ser maior que zero'),
  unit: z.enum(UNITS),
});
```

- Campo de preço usa `MaskedInput` com `mask="currency"`: o valor do form já trafega em **centavos** (string), evitando conversão reais↔centavos fora do componente de máscara — digitação funciona como uma calculadora (dígitos entram pela direita).
- Unidade de medida é um seletor de chips (`UN`/`KG`/`CX`/`L`/`PC`), não um `<select>`/Picker — evita dependência extra (`@react-native-picker/picker` não está instalado).
- **Categoria:** seletor de chips carregado da tabela `categories` (recarregado a cada foco da tela via `useFocusEffect`, para já refletir uma categoria criada em `CategoryListScreen`, **e também logo após criar uma categoria inline nesta própria tela** — ver abaixo). Um chip extra "Nova categoria" (ícone `+`) fica sempre disponível ao final da lista de chips, **mesmo quando já existem categorias** — corrige um bug da Fase 12, onde só era possível criar a primeira categoria direto do formulário (via um link que só aparecia com a lista vazia); com categorias já cadastradas, a única forma de criar uma nova era navegar até `CategoryListScreen`. Tocar em "Nova categoria" abre uma linha inline (`MaskedInput` + confirmar/cancelar, mesmo padrão de edição do `CategoryListScreen`) que cria a categoria (`categoryService.createCategory`, com a mesma checagem de nome duplicado) e já a seleciona no formulário, sem sair da tela.
- Botão "Excluir produto" (modo edição) com confirmação via `Alert.alert` + `markAsDeleted()`.
- **Modo somente-leitura (Fases 7/8):** "Salvar"/"Excluir produto" ficam `disabled` (com aviso) quando `useLicenseAccess().readOnly`; o chip "Nova categoria" e a linha inline de criação somem inteiramente (não só desabilitados) — mesma leitura de "isso é uma escrita, então não aparece" usada em `CategoryListScreen`.

### `CategoryListScreen` (`src/screens/products/CategoryListScreen.tsx`)
- Tela enxuta de gestão de categorias (sem tela de formulário separada — decisão deliberada pela simplicidade pedida pelo cliente): campo de texto + botão "Adicionar" fixos no topo, lista reativa (`withObservables`) abaixo, ordenada por nome.
- Cada linha mostra o nome da categoria e a contagem de produtos nela (`category.products.fetchCount()`, resolvida sob demanda por linha). Toque no ícone de lápis troca a linha para modo de edição inline (`TextInput` + confirmar/cancelar) — sem `Alert.prompt`, que não existe no Android.
- Validação de nome duplicado (case-insensitive, mesmo padrão de duplicidade dos outros módulos) tanto ao criar quanto ao renomear — lógica compartilhada com `ProductFormScreen` via `src/services/categoryService.ts` (`isCategoryNameTaken`, `createCategory`), extraído na Fase 13 pra evitar duplicar essa checagem nos dois lugares.
- Exclusão (ícone de lixeira + `Alert.alert` de confirmação): **bloqueada** com aviso se algum produto ainda referencia a categoria (`category.products.fetchCount() > 0`) — evita produtos com `category_id` órfão; o vendedor precisa reatribuir os produtos antes de excluir.
- **Modo somente-leitura (Fases 7/8):** o campo "Nova categoria" some (troca por um aviso), e os ícones de lápis/lixeira de cada linha somem — a lista de categorias continua visível, só a gestão fica indisponível.

---

## 🧩 Componentes reutilizáveis

| Componente | Arquivo | Uso |
|---|---|---|
| `MaskedInput` | `src/components/MaskedInput.tsx` | Input com label + erro, com máscara opcional (`cpfCnpj`, `phone`, `currency`, `cep`, `date` — este último desde a Fase 13) |
| `DiscountInput` | `src/components/DiscountInput.tsx` | Alterna entre desconto em R$ e em % (sempre entrega centavos) — usado hoje só no desconto geral do pedido (`OrderReviewScreen`) |
| `SearchBar` | `src/components/SearchBar.tsx` | Busca com debounce de 300ms embutido, ícone de lupa |
| `Fab` | `src/components/Fab.tsx` | Botão flutuante para criar novo registro |
| `EmptyState` | `src/components/EmptyState.tsx` | Placeholder ilustrado (ícone + título + mensagem) para listas vazias |
| `PrimaryButton` | `src/components/PrimaryButton.tsx` | Botão de ação (variantes `primary`/`success`/`danger`/`outline`, ícone opcional), com estado de loading |
| `Card` | `src/components/Card.tsx` | Container de superfície padrão (ver [docs/02-arquitetura.md](./02-arquitetura.md#-design-system-srctheme)) |
| `Badge` | `src/components/Badge.tsx` | Etiqueta de status colorida |
| `Chip` | `src/components/Chip.tsx` | Pílula selecionável (filtros, forma de pagamento, unidade) |
| `Avatar` | `src/components/Avatar.tsx` | Iniciais do cliente em círculo colorido |
| `StatCard` | `src/components/StatCard.tsx` | Card de métrica do dashboard |
| `SectionHeader` | `src/components/SectionHeader.tsx` | Título de seção + ação opcional |
| `Toast` (`ToastProvider`/`useToast`) | `src/components/Toast.tsx` | Notificação flutuante de confirmação |
| `OrderProgressBar` | `src/components/OrderProgressBar.tsx` | Indicador de progresso do wizard de Nova Venda (3 etapas) |
| `QuantityStepper` | `src/components/QuantityStepper.tsx` | Controle `[- N +]` de quantidade |
| `ReadOnlyBanner` | `src/components/ReadOnlyBanner.tsx` | Faixa fixa acima da navegação, mostrada em toda a app quando a licença está `expired` (Fases 7/8) |
| `LicenseExpiryBanner` | `src/components/LicenseExpiryBanner.tsx` | Faixa dispensável (✕) acima da navegação, avisando vencimento próximo da licença — 5/2/1 dia, 2/1 hora antes (2026-09-01) |

Utilitários: `src/utils/masks.ts` (formatação — inclui `maskDateBR`/`parseDateBR`, Fase 13, usados pelo `mask="date"` do `MaskedInput`), `src/utils/address.ts` (Fase 13 — formata o endereço estruturado do cliente para exibição/PDF), `src/utils/validators.ts` (dígito verificador de CPF/CNPJ), `src/utils/whatsapp.ts` (abrir conversa no WhatsApp via `wa.me`).

---

## 🛒 Módulo Ordem de Venda

Implementado na Fase 5 (branch `feature/modulo-ordem-venda`) e redesenhado visualmente na Fase 10. Fluxo guiado de **4** telas (`OrderDraftNavigator`, um `Stack.Navigator` **aninhado**, registrado como a rota `NewOrder` do stack raiz) + listagem/detalhe fora do fluxo de criação. As 3 primeiras etapas mostram um indicador de progresso (`OrderProgressBar`) no topo; a 4ª (`OrderSuccess`) é a tela terminal do fluxo, sem botão de voltar nativo.

### Estado do rascunho (`useOrderDraft`, `src/hooks/useOrderDraft.tsx`)

As 3 telas do fluxo compartilham estado via **React Context** (`OrderDraftProvider`), que envolve só o `OrderDraftNavigator` — monta zerado a cada "Nova Ordem" e desmonta (descarta o rascunho) ao sair do fluxo. Guarda `clientId`/`clientName`, a lista de itens do carrinho (`CartItem[]`, ver [`src/types/orderDraft.ts`](../src/types/orderDraft.ts)) e expõe totais computados (`useMemo`). Escolhido em vez de passar tudo via params de navegação (evita serializar um carrinho inteiro a cada navegação) e em vez de uma lib de state management externa (Context resolve bem pro escopo de 3 telas).

### 1. `OrderSelectClientScreen` — Seleção do cliente
- Lista reativa (`withObservables`) + busca por nome/documento — mesmo padrão de [`ClientListScreen`](./05-modulos-telas.md#-módulo-clientes).
- Toque num cliente → `setClient(id, name)` no contexto → avança para `OrderItems`.
- Botão "Cadastrar novo cliente": usa `navigation.getParent()` para navegar até a rota `ClientForm` do stack **raiz** (fora do fluxo aninhado) — ao voltar, o cliente novo já aparece na lista (reativa) para ser selecionado.

### 2. `OrderItemsScreen` — Catálogo e carrinho
- Catálogo de produtos em cards (nome, unidade, preço em destaque — SKU removido na Fase 12), em `FlatList` com `numColumns` responsivo (`useWindowDimensions` — 2 colunas a partir de 760px de largura, 1 coluna abaixo disso, comum em tablets em retrato vs. paisagem). Busca por nome + filtro por categoria (mesmos `Chip`s "Todas" + uma por categoria de `ProductListScreen`) no cabeçalho da lista.
- Produto **fora** do carrinho: card mostra botão "+ Adicionar". Produto **já no** carrinho: card troca para [`QuantityStepper`](../src/components/QuantityStepper.tsx) (+/-) + botão de lixeira (remove o item inteiro, independente da quantidade).
- **Barra flutuante inferior fixa** (`bottomBar`): contagem total de itens, total geral (`totals.totalGross`) e botão "Avançar" (desabilitado com carrinho vazio) → `OrderReview`. Tocar na área de resumo abre um **modal de carrinho** (`Modal` nativo, slide de baixo para cima) listando cada item com stepper e remoção individual — forma rápida de revisar/ajustar sem sair da tela de catálogo.
- **Mudança de escopo vs. versão anterior:** o desconto por item (`DiscountInput` por linha do carrinho) foi removido desta tela na Fase 10 — o carrinho aqui só lida com quantidade. Todo desconto agora é aplicado uma única vez, como desconto geral do pedido, na etapa seguinte (`OrderReviewScreen`). `CartItem.discountValue` (`src/types/orderDraft.ts`) continua existindo no tipo e é somado no cálculo de subtotal, mas nenhuma tela hoje o define como diferente de `0` — decisão deliberada para simplificar o fluxo visual (catálogo rápido → fechamento com desconto único), não uma remoção de capacidade do modelo de dados.
- Resumo mostrado na barra flutuante e no modal: quantidade total e total geral (soma de `unit_price × quantity` por item, sem desconto — vira `orders.total_gross` no Passo 3).

### 3. `OrderReviewScreen` — Resumo e fechamento
- Mostra cliente e itens tabulados (somente leitura, sem coluna de desconto por item — ver mudança de escopo acima).
- `DiscountInput` para o **desconto geral do pedido** (`orders.discount_total`, aplicado sobre `total_gross`).
- **Data de entrega (Fase 13, opcional):** `MaskedInput` com `mask="date"` (novo tipo de máscara, `dd/mm/aaaa` — dígitos puros por baixo, mesma convenção de `cep`/`phone`; parser `parseDateBR()` em `src/utils/masks.ts`, que valida se a data realmente existe, ex: rejeita 31/02). Campo livre — deixar em branco significa "sem data combinada ainda" (`orders.delivery_date = null`). Se o usuário digitar uma data incompleta e tentar salvar, o campo mostra erro "Data de entrega inválida" e bloqueia o salvamento.
- Seletor de forma de pagamento em `Chip`s com ícone (`PAYMENT_METHOD_LABELS` — Dinheiro, PIX, Boleto, Cartão de Crédito, Cartão de Débito, A Prazo).
- Campo de observações gerais (`orders.notes`, opcional).
- Botão **"Salvar pedido"** → `orderService.createOrder(...)`:
  1. Calcula `total_net = max(0, total_gross − discount_total)`.
  2. Calcula `order_number` (Fase 13): conta quantos pedidos esse cliente já tem (`Q.where('client_id', clientId)`) e soma 1 — é um número **por cliente**, não um id global.
  3. Persiste `orders` + todos os `order_items` numa única transação (`database.write` + `database.batch(...)` — **atenção**: `database.batch()` só pode ser chamado de dentro de um `database.write()` nesta versão do WatermelonDB, ao contrário de `collection.create()`).
  4. Zera o rascunho (`reset()`) e navega para `OrderSuccess` (dentro do próprio `OrderDraftNavigator`, não mais direto para `OrderDetail` do stack raiz — ver abaixo).

### 4. `OrderSuccessScreen` — Confirmação
- Tela terminal do wizard (`headerBackVisible: false`, `gestureEnabled: false` — o vendedor não deve conseguir "voltar" para um pedido já salvo). Recebe `orderId` via params e recarrega `Order`/`Client`/`OrderItem[]` direto do WatermelonDB (não reaproveita o contexto do rascunho, que já foi zerado).
- Ícone de sucesso animado (`Animated.spring`), resumo do pedido (cliente, quantidade de itens, total líquido) num `Card`.
- Botão principal verde **"Compartilhar Ordem de Venda (PDF / WhatsApp)"** → `pdfService.shareOrderPdf(...)` (ver seção de PDF abaixo).
- Botão secundário **"Voltar para o Início"** → `parentNavigation.reset({ index: 0, routes: [{ name: 'Home' }] })` (via `getParent()`), limpando todo o histórico do wizard — evita que o botão "voltar" do sistema retorne para uma tela do fluxo de criação já concluído. Dispara um `Toast` de confirmação ao voltar.

### `OrderListScreen` — Listagem
- Lista reativa ordenada por `created_at` desc. Filtro por status (chips: Todos/Pendente/Concluído/Cancelado) e busca por nome do cliente via `Q.on('clients', Q.where('name', Q.like(...)))` — filtra pela tabela relacionada direto na query, sem carregar tudo em memória.
- Cada card observa reativamente seu próprio cliente e contagem de itens (`withObservables(['order'], ({ order }) => ({ client: order.client.observe(), itemCount: order.items.observeCount() }))` — padrão comum do WatermelonDB para listas onde cada linha depende de uma relação).
- Exibe: ID resumido (8 primeiros caracteres do `id`), nome do cliente, data/hora (`toLocaleString('pt-BR')`), contagem de itens, status (badge colorido) e `total_net` formatado em BRL. Se houver `delivery_date` (Fase 13), mostra "Entrega em dd/mm/aaaa" (ícone `cube-outline`) entre o nome do cliente e o rodapé do card — mesmo padrão usado nos cards de "Últimos pedidos" da `HomeScreen`.
- FAB "+" → `NewOrder` (novo fluxo de criação), via `useReadOnlyGuard().guard(...)` (Fases 7/8) — junto com o botão "Nova Venda" da `HomeScreen`, são os dois únicos pontos de entrada do fluxo de criação, então bloqueá-los ali já é suficiente (as 3 telas do wizard em si não precisam de gating próprio).

### `OrderDetailScreen` — Detalhe
- Carrega a `Order` por id (`database.get('orders').find(orderId)`) e observa reativamente cliente + itens.
- Mostra todos os itens (com `product_name_snapshot`, não o nome atual do produto — protege o histórico), totais (`total_gross`/`discount_total`/`total_net`), forma de pagamento e observações.
- Botão **"Compartilhar (PDF / WhatsApp)"** → `pdfService.shareOrderPdf(order, client, items)` — mesmo mecanismo usado em `OrderSuccessScreen`, disponível aqui para reemitir o PDF de qualquer pedido já salvo (não só no momento da criação).
- Ações (`orderService.ts`):
  - "Marcar como concluído" (só se `pending`) → `setOrderStatus(id, 'completed')`.
  - "Cancelar pedido" (se não já `cancelled`) → confirmação (`Alert.alert`) → `setOrderStatus(id, 'cancelled')`.
  - "Excluir pedido" → confirmação → `deleteOrder(id)`, que também marca todos os `order_items` associados como excluídos (`markAsDeleted`, em lote) antes do próprio pedido — evita itens órfãos.
- **Modo somente-leitura (Fases 7/8):** os 4 botões (Compartilhar/Concluir/Cancelar/Excluir) ficam `disabled`, com um aviso acima — o detalhe do pedido continua totalmente visível.

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

> 🚧 **Ainda fora de escopo:** inclusão de `orders`/`order_items` no módulo de Backup (mencionado como pendente em [docs/06](./06-changelog-tarefas.md), depende deste módulo existir — agora existe, mas a integração com `backupService.ts` ainda não foi feita). A geração de PDF (Fase 6), que estava pendente aqui, **foi implementada na Fase 10** — ver seção seguinte.

---

## 🧾 Template do PDF (A4) — `templates/orderTemplate.ts`

Implementado na Fase 10, com o cabeçalho **redesenhado na Fase 13** para incluir a logo/identidade do vendedor e mais dados do cliente/pedido. O PDF é gerado a partir de uma string HTML (CSS inline, sem dependências externas) renderizada pelo `expo-print` (`Print.printToFileAsync`). Estrutura real:

```text
┌───────────────────────────────────────────────────────────┐
│  [Logo ou nome da empresa]      ORDEM DE VENDA              │
│                                  (11) 99999-8888             │
│                                  João Vendedor (vendedor)     │
│                                  21/08/2026 às 14:32          │
├───────────────────────────────────────────────────────────┤
│  Cliente                         Pedido nº (cliente)          │
│  Maria Compradora                3                            │
│  Entrega                         Cidade                       │
│  25/08/2026                      São Paulo - SP               │
│  Endereço                        CPF/CNPJ                     │
│  Rua Exemplo, 123 - Sala 4       123.456.789-00               │
│  Pagamento                                                     │
│  PIX                                                            │
├───────────────────────────────────────────────────────────┤
│  [Tabela de Itens]                                            │
│  Produto        Qtd   Unit.       Desconto      Subtotal      │
│  ─────────────────────────────────────────────────────────    │
│  Produto A       2   R$10,00         —          R$20,00       │
│  Produto B       1   R$50,00         —          R$50,00       │
├───────────────────────────────────────────────────────────┤
│  [Totais]  Total bruto / Desconto geral / TOTAL LÍQUIDO        │
├───────────────────────────────────────────────────────────┤
│  Documento gerado offline pelo aplicativo Vendas App          │
│  — sem validade fiscal.                                        │
└───────────────────────────────────────────────────────────┘
```

- **Cabeçalho (linha de cima):** à esquerda, a **logo da empresa** (`company_settings.logo_base64`, `<img>` com `max-height`/`object-fit: contain`) — se não houver logo cadastrada, cai no nome da empresa em texto (`nome_fantasia` → `razao_social`). À direita: telefone da empresa (`maskPhone`), nome do vendedor (`vendedor_nome`, omitido se vazio) e data/hora de emissão do pedido.
- **Bloco de informações (duas colunas), Fase 13:**
  - Coluna esquerda: nome do cliente, **data de entrega** (`order.deliveryDate`, ou "A combinar" se não tiver sido definida), **endereço** (`formatClientStreetLine()` — rua/número/complemento) e forma de pagamento.
  - Coluna direita: **número do pedido do cliente** (`order.orderNumber` — "1", "2", "3"... por cliente, não um id global; pedidos criados antes da Fase 13 mostram o código curto do `id` como referência, já que não têm essa numeração), **cidade** (`formatClientCityLine()` — cidade/UF) e CPF/CNPJ do cliente.
- O rodapé usa o **nome do app** (`APP_DISPLAY_NAME = 'Vendas App'`, `src/utils/appInfo.ts`) — não o nome da empresa do vendedor, que já aparece no cabeçalho.

### Função geradora real (`src/services/pdfService.ts`)

```ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getOrCreateCompanySettings } from '@/services/settingsService';
import { buildOrderHtml } from '@/templates/orderTemplate';

export async function shareOrderPdf(order: Order, client: Client, items: OrderItem[]): Promise<void> {
  const company = await getOrCreateCompanySettings();
  const html = buildOrderHtml(order, client, items, company);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('O compartilhamento não está disponível neste dispositivo.');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Ordem de venda #${order.id.slice(0, 8).toUpperCase()}`,
    UTI: 'com.adobe.pdf',
  });
}
```

- `buildOrderHtml` recebe os **models** do WatermelonDB diretamente (`Order`, `Client`, `OrderItem[]`, e desde a Fase 13 também `CompanySettings`) — não um DTO intermediário — porque as telas chamadoras já têm essas instâncias em mãos, e `shareOrderPdf` busca `CompanySettings` internamente (`getOrCreateCompanySettings()`), sem precisar que `OrderSuccessScreen`/`OrderDetailScreen` passem esse dado.
- Todo texto interpolado no HTML passa por um `escapeHtml()` local antes de entrar no template — nome do cliente, endereço, observações e nome de produto podem conter caracteres digitados livremente pelo usuário (`<`, `&`, etc.), e o HTML é montado por concatenação de string, não por um template engine com escaping automático.
- Chamada a partir de dois pontos da UI: `OrderSuccessScreen` (botão verde "Compartilhar Ordem de Venda (PDF / WhatsApp)", logo após salvar) e `OrderDetailScreen` (botão "Compartilhar (PDF / WhatsApp)", para reemitir um pedido já existente a qualquer momento).
- O compartilhamento usa o menu **nativo** do sistema (`expo-sharing`) — não há integração direta com a API do WhatsApp Business; o usuário escolhe o app de destino (WhatsApp, e-mail, Drive, etc.) no menu do sistema operacional.
- Aviso explícito no rodapé do PDF, reforçando o item "Fora de escopo" da Visão Geral: *"Documento gerado offline pelo aplicativo Vendas App — sem validade fiscal."*
- Sem testes automatizados ainda (pendente, Fase 9).

---

## 💾 Módulo Backup

### `BackupScreen` (`src/screens/backup/BackupScreen.tsx`)
- **Exportar — duas opções**, ambas geram o mesmo JSON (`vendas-app-backup-AAAA-MM-DD_HH-mm-ss.json`, via a API nova do `expo-file-system` — classes `File`/`Directory`/`Paths`, não a API legada `FileSystem.writeAsStringAsync`):
  - **"Compartilhar backup"** (`backupService.exportBackup()`): escreve o arquivo em `Paths.document` (armazenamento privado do app) e abre o menu nativo de compartilhamento (`expo-sharing`) — WhatsApp, e-mail, Drive, etc. Em alguns aparelhos/emuladores sem um app de "Arquivos" instalado, esse menu **não** mostra uma opção de "salvar no aparelho" (só apps que registram esse tipo de compartilhamento aparecem).
  - **"Salvar no dispositivo"** (`backupService.saveBackupToDevice()`): abre o seletor de pastas do próprio sistema (`Directory.pickDirectoryAsync()` — Storage Access Framework no Android) e grava o arquivo diretamente na pasta escolhida (ex: Downloads). Funciona independentemente de quais apps estão instalados — é a forma garantida de "baixar" o arquivo.
- **Importar** (`backupService.pickAndPreviewBackupFile()` + `importBackup()`): abre o seletor de arquivos nativo (`File.pickFileAsync`, também da API nova do `expo-file-system` — não usa `expo-document-picker`, redundante), valida a estrutura com Zod, e mostra uma prévia na própria tela (quantos registros são novos vs. já existentes) antes do usuário confirmar. Registros já existentes são ignorados na importação — clientes por `document`, categorias por `name` (case-insensitive), produtos também por `name` (case-insensitive, desde a Fase 12, sem mais `sku`), e pedidos pela combinação cliente+`order_number` (ver abaixo). Inserção em lote via `database.batch(...)` (uma única transação).
- **Categorias no backup (Fase 12):** exportadas por **nome**, não por `id` — cada produto carrega `category_name` (não `category_id`), já que um `id` gerado localmente não faz sentido ao restaurar em outro dispositivo. Na importação, categorias novas são criadas primeiro; produtos são então associados por nome (criando a categoria automaticamente se, por algum motivo, ainda não existir).
- **Pedidos no backup (Fase 8, completado em 2026-09-01):** cada pedido carrega `client_document` (não `client_id`, mesmo raciocínio de categoria/produto) e a lista de itens (`product_name_snapshot`, preço, quantidade, desconto, subtotal — não `product_id`, já que a relação com o produto nunca é lida pela UI, só o snapshot). Chave de deduplicação: `client_document` + `order_number` juntos (`order_number` é sequencial **por cliente**, não um id global — dois clientes diferentes podem ambos ter um "pedido nº 1"). Um pedido só é importado se o cliente dele existir localmente (já cadastrado, ou vindo junto no mesmo arquivo de backup) — senão fica de fora, contado como "ignorado" na prévia. Ao montar o item, `product_id` é resolvido por nome contra os produtos existentes/recém-importados (best-effort — fica em branco se o produto correspondente não existir mais, sem quebrar nada, já que essa relação nunca é lida pela UI).
  > ⚠️ **Limitação conhecida:** a data de criação do pedido (`created_at`) **não é preservada** na importação — é um campo `@readonly` do WatermelonDB, sempre gravado como "agora" no momento em que o registro é criado, então um pedido de 2026-08-01 importado hoje nasce com a data de hoje. O JSON inclui `created_at` só como referência informativa; o campo `order_number`/`delivery_date`/status/valores são todos preservados corretamente.
- `license_control` nunca entra no backup (é específico do dispositivo, não faz sentido restaurar em outro aparelho). `company_settings` também nunca entrou (config isolada, não é uma entidade de negócio compartilhável entre dispositivos).
- **Modo somente-leitura (Fases 7/8):** único módulo com regra assimétrica — "Escolher arquivo de backup" (importar) fica `disabled` com aviso; **exportar continua sempre liberado**, inclusive quando `blocked` (nesse caso via um botão dedicado direto na `LicenseBlockedScreen`, já que essa tela nem chega a ser montada — ver [docs/04](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active)).
- **Endereço estruturado do cliente (Fase 13):** o antigo campo único `address` foi substituído por `address_street`/`address_number`/`address_complement`/`address_city`/`address_state`/`address_zip` no JSON, espelhando as novas colunas de `clients` (ver [docs/03](./03-banco-de-dados.md#-tabela-clients)).

```json
{
  "exported_at": "2026-08-22T14:00:00.000Z",
  "app_version": "1.0.0",
  "clients": [
    {
      "name": "João da Silva",
      "document": "11144477735",
      "phone": "11987654321",
      "address_street": "Rua Exemplo",
      "address_number": "123",
      "address_city": "São Paulo",
      "address_state": "SP",
      "address_zip": "01310100"
    }
  ],
  "categories": [
    { "name": "Bebidas" }
  ],
  "products": [
    { "name": "Refrigerante 2L", "category_name": "Bebidas", "price": 990, "unit": "UN" }
  ],
  "orders": [
    {
      "client_document": "11144477735",
      "status": "pending",
      "total_gross": 1980,
      "discount_total": 0,
      "total_net": 1980,
      "payment_method": "pix",
      "order_number": 1,
      "delivery_date": null,
      "created_at": "2026-08-22T14:00:00.000Z",
      "items": [
        { "product_name_snapshot": "Refrigerante 2L", "unit_price": 990, "quantity": 2, "discount_value": 0, "subtotal": 1980 }
      ]
    }
  ]
}
```

## ⚙️ Módulo Configurações

Implementado na Fase 11. `SettingsScreen` (`src/screens/settings/SettingsScreen.tsx`) é acessível pelo ícone de engrenagem no cabeçalho da `HomeScreen` (`navigation.navigate('Settings')`) e, como todo o resto do `RootNavigator`, só é alcançável com a licença `active` (mesma restrição já documentada para `Backup` — ver [docs/04](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active)). Três seções, cada uma em um `CollapsibleCard` (`src/components/CollapsibleCard.tsx`, novo componente reutilizável — `Card` com um cabeçalho tocável: ícone, título, subtítulo opcional e um chevron animado que gira 180° ao expandir/recolher):

- **Accordion de seção única:** as três seções começam recolhidas (`expandedSection: 'company' | 'system' | 'data' | null`, inicial `null`) — abrir uma fecha automaticamente a que estava aberta antes (só uma seção expandida por vez), mantendo a tela curta mesmo com o formulário extenso da Seção 1. Pedido explícito do usuário para não deixar a tela de Configurações "muito grande".

### 1. Dados da Empresa / Vendedor
- Formulário React Hook Form + Zod, persistido na tabela `company_settings` (WatermelonDB — ver [docs/03](./03-banco-de-dados.md#-tabela-company_settings)) via `settingsService.getOrCreateCompanySettings()`/`saveCompanySettings()`.
- Campos: Razão Social/Nome (obrigatório), Nome Fantasia, **Nome do Vendedor** (Fase 13 — opcional; exibido na saudação da `HomeScreen` e no cabeçalho do PDF, com prioridade sobre Nome Fantasia/Razão Social nesses dois lugares), CNPJ/CPF (`MaskedInput mask="cpfCnpj"`, validado com `isValidCpfOuCnpj` só quando preenchido — diferente do cadastro de Clientes, aqui o campo pode ficar vazio até o vendedor preencher), I.E./I.M., Telefone/WhatsApp (obrigatório), E-mail comercial (validado por formato quando preenchido), endereço estruturado (Logradouro/Número/Bairro/Cidade/UF/CEP — `MaskedInput mask="cep"`, máscara nova em `utils/masks.ts`), Chave PIX (texto livre, sem validação de formato).
- **Logo da Empresa (Fase 13):** preview 72×72 (ou um placeholder tracejado se não houver logo) + botão "Selecionar logo"/"Trocar logo" (`settingsService.pickCompanyLogo()`) + botão "Remover" quando já existe uma. `pickCompanyLogo()` reaproveita o seletor de arquivos do sistema (`File.pickFileAsync`, mesma API já usada no módulo Backup) filtrado por `image/png`/`image/jpeg` — decisão deliberada para **não instalar `expo-image-picker`** só para isso (mesma filosofia de evitar dependência extra já registrada para o seletor de unidade de Produtos). Limite de 2MB no arquivo original; lê o conteúdo como base64 (`file.base64()`) e monta um data URI (`data:image/png;base64,...`), salvo direto em `company_settings.logo_base64` — diferente do restante do formulário, a logo é salva **imediatamente** ao selecionar (não espera o botão "Salvar Dados da Empresa"), para o vendedor não perder a seleção se esquecer de salvar o resto.
- Botão "Salvar Dados da Empresa" → `Toast` de sucesso ("Dados da empresa salvos com sucesso!").
- Ao entrar na tela, os campos são carregados automaticamente (registro único, criado sob demanda na primeira visita).
- **Modo somente-leitura (Fases 7/8):** "Salvar Dados da Empresa", "Selecionar/Trocar logo" e "Remover" (logo) ficam `disabled` quando `useLicenseAccess().readOnly` — os dados continuam visíveis, só não editáveis.

### 2. Sistema e Sobre
- **ID do Dispositivo:** reaproveita o `device_id` já gerado por `licenseService` (UUID v4, o mesmo registrado na tabela `licenses` do Supabase) — **não** usa `expo-application`/Android ID. Foi uma decisão deliberada: o ID mostrado precisa ser exatamente o mesmo que o suporte consulta no Supabase para liberar a licença; um identificador nativo diferente (Android ID) quebraria esse fluxo, já que não seria o valor cadastrado remotamente. Exibido em `fontFamily: 'monospace'` (`Platform`-neutro o suficiente: `'monospace'` resolve tanto no Android quanto no iOS via Courier/fonte mono padrão do sistema).
  - Botão **"Copiar ID"** → `Clipboard.setStringAsync()` (`expo-clipboard`) + `Toast` de confirmação + label do botão muda para "ID copiado!" por 2s.
  - Botão **"Enviar por WhatsApp"** → `utils/whatsapp.ts` (`openWhatsApp`, que ganhou um 2º parâmetro opcional `message` nesta fase) abre o WhatsApp do número de suporte (`EXPO_PUBLIC_SUPPORT_WHATSAPP_PHONE`, novo em `.env`/`services/api.ts`) com uma mensagem pré-preenchida contendo o ID. Fica desabilitado (com aviso abaixo) se a variável não estiver configurada — mesmo padrão de "feature opcional degradando graciosamente" já usado para `isSupabaseConfigured()`.
- **Status da conexão:** `Badge` com `dot`, "Online"/"Modo Offline", via `useNetInfo()` — mesmo hook/lógica já usado na `HomeScreen`.
- **Status da licença:** mostra a data de validade atual e um `Badge` de status (`LICENSE_STATUS_LABELS`/`LICENSE_STATUS_TONE`, novos em `types/database.ts`, mesmo padrão de `ORDER_STATUS_LABELS`/`TONE`). O snapshot inicial vem de `licenseService.getCurrentLicenseSnapshot()` — uma leitura **passiva** do registro local (nova função, sem checar o Supabase nem alterar nada), para não disparar uma renovação/verificação remota só de abrir a tela. Botão **"Verificar Licença Agora"** chama `evaluateLicense()` (a mesma função usada no boot do app pelo `useLicenseGuard`) e atualiza a exibição com o resultado.
  > 🚧 **Limitação conhecida:** se a verificação manual retornar `blocked`/`expired`, a tela de Configurações só atualiza o `Badge` local — não força a navegação de volta para `LicenseBlockedScreen` (isso exigiria propagar o resultado até o estado do `useLicenseGuard`, que vive no `RootNavigator`, acima da pilha de navegação). O novo status já fica persistido no WatermelonDB por `evaluateLicense()`, então é aplicado corretamente na próxima abertura do app — só não é reforçado instantaneamente na sessão atual.
- **Versão do aplicativo:** `v${APP_VERSION}`, lida de `app.json` em tempo de build via `utils/appInfo.ts` (import direto do JSON, `resolveJsonModule` já habilitado no `tsconfig` base do Expo) — não depende de `expo-constants` (não instalado; evitado para não adicionar uma dependência só para isso).

### 3. Dados, Backup e Armazenamento
- **Resumo do banco local:** contadores de Clientes/Produtos/Ordens de Venda (`settingsService.getDatabaseSummary()`), atualizados a cada vez que a tela ganha foco (`useFocusEffect`, mesmo padrão da `HomeScreen`) — assim os números refletem mudanças feitas em outras telas (ex: voltar de uma Nova Venda).
- **Exportar Backup (JSON):** botão chama `backupService.exportBackup()` diretamente (a mesma função usada pelo botão "Compartilhar backup" da `BackupScreen`) — abre o menu nativo de compartilhamento.
- **Importar/Restaurar Backup:** em vez de duplicar o fluxo de seleção de arquivo + prévia + confirmação já implementado em `BackupScreen` (não é uma ação de um toque só — precisa de uma tela própria para mostrar a prévia de registros novos/duplicados antes de confirmar), o botão navega para a tela `Backup` já existente (`navigation.navigate('Backup')`). Decisão deliberada para não duplicar ~80 linhas de lógica de preview/confirmação entre duas telas.
- **Zona de perigo — "Limpar Pedidos de Teste":** remove todas as `orders`/`order_items` (não toca em `clients`/`products`), via nova função `orderService.clearAllOrders()` (soft-delete em lote, mesmo padrão de `deleteOrder`). Protegido por um modal de confirmação customizado (não o `Alert.alert` nativo usado nas outras exclusões do app) — ícone de aviso, contagem de quantos pedidos serão removidos, texto explícito "não pode ser desfeita", botões "Cancelar"/"Sim, limpar tudo". Justificativa para o modal customizado em vez do `Alert` padrão: esta é uma ação destrutiva em massa (todos os pedidos, não um registro isolado), então merece um passo de confirmação visualmente mais explícito que os `Alert.alert` de exclusão individual já usados em `ClientFormScreen`/`ProductFormScreen`/`OrderDetailScreen`.
- **Modo somente-leitura (Fases 7/8):** só "Limpar Pedidos de Teste" fica `disabled` — "Exportar Backup" e o botão que navega para `Backup` continuam liberados (a tela `Backup` já trata a distinção importar/exportar internamente); "Verificar Licença Agora" também continua liberado (é a própria ação de tentar sair do modo somente-leitura).

## 📎 Documentos relacionados

- Banco de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
