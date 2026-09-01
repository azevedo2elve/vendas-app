# 06 — Changelog e Tarefas

## 📌 Como usar este documento

Este arquivo é o registro histórico de mudanças do projeto, organizado por **fases** de desenvolvimento. Toda vez que uma feature for implementada, um schema alterado ou uma regra de negócio modificada, adicione uma entrada na fase correspondente (ou crie uma nova fase) seguindo o formato abaixo — conforme a regra obrigatória descrita no `CLAUDE.md`.

### Formato de entrada

```text
### AAAA-MM-DD — Título curto da mudança
- **Tipo:** feature | fix | schema | docs | refactor | chore
- **Resumo:** o que mudou e por quê, em 1-3 linhas.
- **Docs afetados:** lista de arquivos em docs/ que foram atualizados junto.
```

---

## 🗺️ Fases do projeto

| Fase | Escopo | Status |
|---|---|---|
| **Fase 0** | Estruturação inicial e documentação | 🟢 Concluído |
| **Fase 1** | Setup do projeto (Expo, TypeScript, navegação base) | 🟢 Concluído |
| **Fase 2** | Banco de dados local (WatermelonDB: schema, migrations, models) | 🟡 Em andamento (schema v1 + models prontos; `migrations.ts` só entra na 1ª alteração pós-v1) |
| **Fase 3** | Módulo Clientes (CRUD + busca indexada) | 🟢 Concluído |
| **Fase 4** | Módulo Produtos (CRUD + filtros) | 🟢 Concluído |
| **Fase 5** | Módulo Ordem de Venda (carrinho, cálculo, persistência) | 🟢 Concluído |
| **Fase 6** | Geração de PDF e compartilhamento (WhatsApp/e-mail) | 🟢 Concluído (implementado na Fase 10, junto com o redesign visual) |
| **Fase 7** | Sistema de Licença Offline (validação, renovação, tela de bloqueio) | 🟡 Em andamento (`licenseService` + `useLicenseGuard` + `LicenseBlockedScreen` prontos; acesso somente-leitura em `expired` depende das Fases 3/4/8) |
| **Fase 8** | Módulo Backup (exportação/importação JSON) | 🟡 Em andamento (Clientes + Produtos prontos; falta incluir `orders`/`order_items` agora que a Fase 5 existe; acesso mesmo com licença `expired` ainda não implementado) |
| **Fase 9** | Polimento, testes e preparação para build (EAS) | ⚪ Não iniciado (revisão visual das telas críticas antecipada pela Fase 10; faltam testes automatizados e build EAS) |
| **Fase 10** | Redesign visual comercial (design system, dashboard, PDF, tablet) | 🟢 Concluído |
| **Fase 11** | Tela de Configurações (empresa/vendedor, dispositivo/licença, backup, dados) | 🟢 Concluído |
| **Fase 12** | Categorias de produtos + remoção do SKU | 🟢 Concluído |

Legenda: ⚪ Não iniciado · 🟡 Em andamento · 🟢 Concluído · 🔴 Bloqueado

---

## Fase 0 — Estruturação inicial e documentação

### 2026-08-21 — Criação da documentação técnica inicial
- **Tipo:** docs
- **Resumo:** Criada a pasta `docs/` com a documentação completa do projeto (visão geral, arquitetura, banco de dados, sistema de licença, módulos/telas e este changelog). Adicionada ao `CLAUDE.md` a regra obrigatória de manter `docs/` atualizada a cada nova branch ou alteração de código relevante.
- **Docs afetados:** `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/03-banco-de-dados.md`, `docs/04-sistema-licenca.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`, `CLAUDE.md`.

---

## Fase 1 — Setup do projeto

### 2026-08-21 — Setup de arquitetura, persistência local e sistema de licença
- **Tipo:** feature / schema
- **Resumo:** Branch `feature/setup-architecture-watermelondb`. Instaladas as dependências de persistência (WatermelonDB), navegação (React Navigation native-stack), PDF/compartilhamento (`expo-print`, `expo-sharing`), conectividade (`netinfo`) e build de dev (`expo-dev-client`, obrigatório pois WatermelonDB não roda no Expo Go). Configurados `babel.config.js` (decorators legacy + `allowDeclareFields` + alias `@/` via `babel-plugin-module-resolver`) e `tsconfig.json` (`experimentalDecorators`, `paths`). Criada a estrutura modular `src/` completa. Implementados `src/database/schema.ts` e os 5 models WatermelonDB, a instância `src/database/index.ts`, `services/licenseService.ts` (árvore de decisão do licenciamento + bootstrap de trial de 15 dias no primeiro uso), `hooks/useLicenseGuard.ts`, `screens/License/LicenseBlockedScreen.tsx`, `screens/HomeScreen.tsx` (diagnóstico de DB/licença) e `navigation/RootNavigator.tsx`. Validado com `tsc --noEmit` e um bundle Metro (`expo export --platform android`) completo, sem erros.
- **Decisões que divergiram da documentação original:** o schema de `orders`/`order_items` implementado é mais enxuto do que o inicialmente descrito em `docs/03` (sem `order_number`, `updated_at`, soft delete ou snapshots de preço/nome; desconto só a nível de ordem, não por item; adicionado `payment_method`) — `docs/03` e `docs/05` foram reescritos para refletir o schema real.
- **Docs afetados:** `docs/02-arquitetura.md`, `docs/03-banco-de-dados.md`, `docs/04-sistema-licenca.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] Configurar estrutura de pastas conforme [docs/02-arquitetura.md](./02-arquitetura.md).
- [x] Configurar alias de import `@/` no `tsconfig.json` e `babel.config.js`.
- [x] Instalar e configurar React Navigation (`native-stack`).
- [ ] Instalar React Hook Form + Zod + `@hookform/resolvers` (adiado para a Fase 3/4, quando os formulários de Clientes/Produtos entrarem em cena).
- [ ] Configurar ESLint/Prettier alinhados aos padrões de código descritos em [docs/02-arquitetura.md](./02-arquitetura.md#-padrões-de-código).

---

## Fase 2 — Banco de dados local

### Tarefas planejadas
- [x] Instalar `@nozbe/watermelondb` e adapter SQLite.
- [x] Implementar `src/database/schema.ts` conforme [docs/03-banco-de-dados.md](./03-banco-de-dados.md).
- [x] Implementar models: `Client`, `Product`, `Order`, `OrderItem`, `LicenseControl`.
- [ ] Configurar `src/database/migrations.ts` — não criado ainda; schema está na v1 inicial, migrations só são necessárias a partir da 1ª alteração de schema.
- [x] Dados reativos nas listagens — decidido usar `withObservables` (`@nozbe/watermelondb/react`) direto nas telas de lista (Fase 3/4), em vez de um hook `useWatermelonData` customizado. `withObservables` já é a forma idiomática do WatermelonDB de conectar uma query observável a props de componente; um hook próprio seria uma camada redundante por cima disso sem necessidade concreta ainda.

---

## Fase 3 — Módulo Clientes

### 2026-08-22 — CRUD de Clientes
- **Tipo:** feature
- **Resumo:** Branch `feature/crud-clientes-produtos`. Implementado `src/screens/clients/ClientListScreen.tsx` (lista reativa via `withObservables`, busca com debounce por nome/documento, botão de WhatsApp por card, FAB de criação) e `src/screens/clients/ClientFormScreen.tsx` (React Hook Form + Zod, máscaras de CPF/CNPJ e telefone, validação de dígito verificador real via `isValidCpfOuCnpj`, checagem de documento duplicado, exclusão com confirmação via `markAsDeleted()`). Novas rotas `ClientList`/`ClientForm` registradas em `RootNavigator`, acessíveis a partir de um card "Módulos" na `HomeScreen`.
- **Docs afetados:** `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] `ClientListScreen` com busca (nome/documento, debounce 300ms).
- [x] `ClientFormScreen` com validação Zod (CPF/CNPJ com dígito verificador real, telefone).
- [x] ~~Soft delete (`is_active`)~~ — resolvido usando `markAsDeleted()` nativo do WatermelonDB (não precisa de coluna `is_active`; já exclui das queries automaticamente e preserva integridade com `orders`).

---

## Fase 4 — Módulo Produtos

### 2026-08-22 — CRUD de Produtos
- **Tipo:** feature
- **Resumo:** Implementado junto com a Fase 3 na mesma branch. `src/screens/products/ProductListScreen.tsx` (lista reativa via `withObservables`, busca por nome/SKU, preço formatado em BRL) e `src/screens/products/ProductFormScreen.tsx` (React Hook Form + Zod, preço com `MaskedInput mask="currency"` operando em centavos, seletor de unidade por chips em vez de Picker — evita dependência extra —, validação de SKU duplicado, exclusão com confirmação). Novas rotas `ProductList`/`ProductForm` em `RootNavigator`.
- **Decisão de design:** filtro por categoria (mencionado em versão anterior deste doc) não foi implementado — a coluna `category` não existe no schema real ([docs/03](./03-banco-de-dados.md)).
- **Docs afetados:** `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] `ProductListScreen` com busca por nome/SKU (filtro por categoria descartado — sem coluna `category` no schema).
- [x] `ProductFormScreen` com máscara de preço (BRL, em centavos) e validação de SKU único.

---

## Fase 5 — Módulo Ordem de Venda

### 2026-08-23 — Fluxo completo de Ordem de Venda
- **Tipo:** feature / schema
- **Resumo:** Branch `feature/modulo-ordem-venda` (chamada de "Fase 4" na conversa que originou a tarefa, mas corresponde à Fase 5 deste roadmap — Clientes/Produtos já ocupavam as Fases 3/4). Redesenhadas as tabelas `orders`/`order_items` (schema **v1 → v2**, com migration em `src/database/migrations.ts` — ver [docs/03](./03-banco-de-dados.md#-migrations)): `orders` ganhou `total_gross`/`discount_total`/`total_net`/`notes`; `order_items` ganhou `product_name_snapshot`/`discount_value`/`subtotal`. `OrderStatus` virou `'pending'|'completed'|'cancelled'`; `PaymentMethod` virou `dinheiro`/`pix`/`boleto`/`cartao_credito`/`cartao_debito`/`a_prazo`.
  - Implementado o fluxo de criação em 3 etapas como um `Stack.Navigator` **aninhado** (`OrderDraftNavigator`, rota `NewOrder` do stack raiz), com estado compartilhado via Context (`useOrderDraft`, não Redux/Zustand — escopo pequeno o suficiente): `OrderSelectClientScreen` → `OrderItemsScreen` (catálogo + carrinho com `QuantityStepper`/`DiscountInput` novos) → `OrderReviewScreen` (desconto geral, forma de pagamento, observações, `orderService.createOrder()`).
  - `OrderListScreen` (reativa, filtro por status + busca por cliente via `Q.on`) e `OrderDetailScreen` (detalhe + marcar concluído/cancelar/excluir) completam o módulo.
  - `src/services/orderService.ts`: `createOrder`, `setOrderStatus`, `deleteOrder` (exclui os `order_items` associados antes do pedido, evitando itens órfãos).
- **Docs afetados:** `docs/03-banco-de-dados.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] `OrderSelectClientScreen` (seleção de cliente) — nome final diferente do planejado (`NewOrderScreen`), mesma função.
- [x] `OrderItemsScreen` (carrinho com quantidade/desconto por item, R$ ou %) — nome final diferente do planejado (`OrderCartScreen`).
- [x] `OrderReviewScreen` (resumo, desconto geral, forma de pagamento, observações, confirmação e persistência) — nome final diferente do planejado (`OrderSummaryScreen`).
- [x] `OrderListScreen` + `OrderDetailScreen` (listagem com filtro/busca + detalhe com cancelamento/exclusão) — substituiu o `OrderHistoryScreen` planejado, com escopo maior (inclui detalhe e ações de status).
- [x] Cálculo de totais centralizado em `src/types/orderDraft.ts` (helpers puros) + `src/services/orderService.ts` — sem testes automatizados ainda (pendente, junto com o restante da suíte de testes — Fase 9).
- [ ] Incluir `orders`/`order_items` no módulo de Backup — o módulo de Ordem de Venda agora existe, mas essa integração com `backupService.ts` (Fase 8) ainda não foi feita.

---

## Fase 6 — PDF e compartilhamento

### 2026-08-24 — Implementação real do PDF, dentro do redesign da Fase 10
- **Tipo:** feature
- **Resumo:** `templates/orderTemplate.ts` e `services/pdfService.ts` (que só existiam como exemplo de referência em `docs/05`) foram implementados de fato, junto com o redesign visual — ver detalhes na entrada da Fase 10 abaixo.
- **Docs afetados:** `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] `templates/orderTemplate.ts` (HTML do PDF A4).
- [x] `services/pdfService.ts` (`expo-print` + `expo-sharing`).
- [ ] Testar compartilhamento via WhatsApp e e-mail em dispositivo real (Android/iOS) — implementado e validado só via bundle/type-check nesta fase; sem acesso a device físico/tablet no ambiente de desenvolvimento.

---

## Fase 7 — Sistema de Licença Offline

### 2026-08-21 — Validação remota de licença via Supabase
- **Tipo:** feature
- **Resumo:** Integrada a validação/renovação remota da licença com o Supabase (REST/PostgREST direto via `fetch`, sem SDK). Criado `src/services/api.ts` centralizando `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` (lidas de `.env`, inlineadas pelo Metro; `.env.example` versionado como referência). `licenseService.ts` ganhou `fetchLicenseFromSupabase(deviceId)` (GET `/licenses?device_id=eq.{id}`), substituindo o placeholder genérico `LICENSE_API_URL` usado até então. Novo motivo de bloqueio `not_registered` (array vazio = device_id não cadastrado no Supabase) somado aos já existentes (`clock_tampered`, `offline`, `server_rejected`). `evaluateLicense()` agora também retorna `deviceId`, propagado por `useLicenseGuard` até `LicenseBlockedScreen` e `HomeScreen`, para o vendedor poder repassar o ID ao suporte quando o dispositivo não está cadastrado.
- **Decisão de design:** o `device_id` é gerado aleatoriamente no dispositivo (UUID v4), então ele nunca pode já existir no Supabase no momento do bootstrap — por isso a consulta remota só acontece na renovação (`agora >= license_expires_at`), não na primeira abertura do app (ver nota em `docs/04`).
- **Docs afetados:** `docs/02-arquitetura.md`, `docs/04-sistema-licenca.md`, `docs/06-changelog-tarefas.md`.

### 2026-08-21 — Botão de debug + `license_expires_at` como fonte da verdade
- **Tipo:** feature / fix
- **Resumo:** Adicionado `testSupabaseFetch()` em `licenseService.ts` (consulta o Supabase pelo device_id atual sem persistir nada local) e um card "Debug — Supabase" com botão em `HomeScreen.tsx`, visível só em `__DEV__` (some em build de produção), pra facilitar testar a integração sem esperar o trial de 15 dias vencer. `fetchLicenseFromSupabase` deixou de confiar cegamente em `license_status`: mesmo que a coluna no Supabase ainda esteja `active` (job de expiração ainda não rodou), se `license_expires_at` já passou a licença é tratada como rejeitada — `license_expires_at` é a fonte da verdade, `license_status` é auxiliar. Documentado em `docs/04` um job `pg_cron` opcional para manter a coluna `license_status` do Supabase em si sincronizada (a app não depende dele para funcionar corretamente).
- **Docs afetados:** `docs/04-sistema-licenca.md`, `docs/06-changelog-tarefas.md`.

### 2026-08-21 — Job `pg_cron` bidirecional para sincronizar `license_status`
- **Tipo:** infra (Supabase, fora deste repo) / docs
- **Resumo:** Avaliamos duas formas de manter `license_status` sincronizado com `license_expires_at` no Supabase: (a) o app fazer o write-back a cada fetch, ou (b) um job `pg_cron` no banco. Optamos por (b): dar à chave `anon` permissão de `UPDATE` na tabela `licenses` (opção a) seria um risco de segurança sério, já que essa chave vem embutida no APK e não há autenticação por dispositivo — qualquer app instalado poderia reescrever o status de **qualquer** `device_id`, não só o próprio. O job `pg_cron` (`sync_license_statuses()`, substituindo o `expire_licenses()` anterior) agora sincroniza status nos dois sentidos (`active → expired` e `expired → active`, conforme a data), mas nunca sobrescreve `'blocked'` — que continua sendo um kill switch manual, independente da data. Nenhuma mudança de código neste repo; só SQL no Supabase (documentado em `docs/04`).
- **Docs afetados:** `docs/04-sistema-licenca.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] `services/licenseService.ts` implementando a árvore de decisão de [docs/04-sistema-licenca.md](./04-sistema-licenca.md).
- [x] `hooks/useLicenseGuard.ts`.
- [x] `screens/License/LicenseBlockedScreen.tsx`.
- [x] Integração com `@react-native-community/netinfo`.
- [x] Validação/renovação remota real via Supabase (`fetchLicenseFromSupabase`), substituindo o endpoint placeholder.
- [ ] Testes automatizados do anti-fraude de relógio e dos estados de licença (`active`/`expired`/`blocked` + motivos) — implementação manual feita, cobertura de testes ainda pendente (Fase 9).
- [ ] Acesso somente-leitura em `expired` para Clientes/Produtos/Backup — depende das Fases 3, 4 e 8 existirem.

---

## Fase 8 — Módulo Backup

### 2026-08-22 — Exportar/importar backup de Clientes e Produtos
- **Tipo:** feature
- **Resumo:** Implementado `src/services/backupService.ts` (`exportBackup`, `pickAndPreviewBackupFile`, `importBackup`) e `src/screens/backup/BackupScreen.tsx`. Exporta `clients`+`products` para um JSON (via a API nova do `expo-file-system`: `File`/`Directory`/`Paths`) e abre o menu nativo de compartilhamento (`expo-sharing`, já instalado desde a Fase 1) para o usuário salvar onde quiser. Importar usa `File.pickFileAsync` (mesmo pacote — dispensou instalar `expo-document-picker`) para escolher o arquivo, valida com Zod, mostra uma prévia (quantos registros novos vs. duplicados por `document`/`sku`) antes de confirmar, e insere em lote via `database.batch()`. Rota `Backup` adicionada ao `RootNavigator` e ao card "Módulos" da `HomeScreen`.
- **Escopo desta fase:** só `clients`/`products` (pedido explícito do usuário — o app continua guardando os dados só no dispositivo, Supabase segue usado somente para a licença). `orders`/`order_items` ficam para quando a Fase 5 existir.
- **Docs afetados:** `docs/02-arquitetura.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### 2026-08-22 — Botão "Salvar no dispositivo" (fallback ao menu de compartilhamento)
- **Tipo:** fix
- **Resumo:** No emulador Pixel 7 (e potencialmente em aparelhos sem um app de "Arquivos" registrado), o menu de compartilhamento do Android (`expo-sharing`) só mostrava Nearby Share/Drive/Gmail — sem opção de salvar direto no aparelho, porque esse menu só lista apps que registram suporte a receber o tipo de conteúdo compartilhado. Adicionado `saveBackupToDevice()` em `backupService.ts`, usando `Directory.pickDirectoryAsync()` (Storage Access Framework via a API nova do `expo-file-system`) para o usuário escolher uma pasta (ex: Downloads) e gravar o backup ali diretamente — não depende de nenhum app de terceiros. `BackupScreen` ganhou um segundo botão, "Salvar no dispositivo", ao lado de "Compartilhar backup". Nome do arquivo passou a incluir hora/minuto/segundo (não só a data) para evitar colisão ao exportar mais de uma vez no mesmo dia.
- **Docs afetados:** `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] `services/backupService.ts` (exportação JSON via `expo-file-system`) — limitado a `clients`/`products` por enquanto.
- [x] Opção de salvar direto numa pasta escolhida pelo usuário (`saveBackupToDevice`), como alternativa ao menu de compartilhamento em ambientes sem app de "Arquivos".
- [x] Importação com validação Zod e prévia (contagem de novos/duplicados) antes de confirmar.
- [ ] `BackupScreen` acessível mesmo com licença `expired` — depende da distinção de acesso ainda não implementada no `RootNavigator` (ver [docs/04](./04-sistema-licenca.md#-o-que-fica-bloqueado-quando-a-licença-não-está-active)).
- [ ] Incluir `orders`/`order_items` no backup — o módulo de Ordem de Venda (Fase 5) já existe agora; falta integrar em `backupService.ts`.

---

## Fase 9 — Polimento e build

### Tarefas planejadas
- [x] Revisão de UX em telas críticas (carrinho, bloqueio de licença) — antecipada pelo redesign da Fase 10.
- [ ] Configuração de build via EAS (`eas.json`).
- [ ] Checklist final de conformidade com `docs/` antes do release.

---

## Fase 10 — Redesign visual comercial (design system, dashboard, PDF, tablet)

### 2026-08-24 — Reformulação de UI/UX para apresentação comercial ao cliente
- **Tipo:** feature / refactor
- **Resumo:** Reformulação visual completa do app, focada em tablet, para demonstração comercial. Principais mudanças:
  - **Design system novo** (`src/theme/`: `colors`, `spacing`/`radii`, `typography`, `shadows`, `layout`) substituindo os valores hardcoded duplicados em cada `StyleSheet.create` — paleta navy/slate + azul royal (`accent`) + verde esmeralda (`success`, valores monetários) + âmbar/vermelho (avisos/erros). Ver [docs/02-arquitetura.md](./02-arquitetura.md#-design-system-srctheme).
  - **Biblioteca de ícones** `@expo/vector-icons` (`Ionicons`) adicionada — substitui emojis/glifos de texto usados como placeholder (ex: 💬 do WhatsApp, `+`/`−` de texto no stepper).
  - **Novos componentes reutilizáveis:** `Card`, `Badge`, `Chip`, `Avatar`, `StatCard`, `SectionHeader`, `IconButton`, `Toast`/`ToastProvider`, `ScreenContainer`, `OrderProgressBar` — ver tabela em [docs/05-modulos-telas.md](./05-modulos-telas.md#-componentes-reutilizáveis). Componentes antigos (`PrimaryButton`, `Fab`, `EmptyState`, `SearchBar`, `QuantityStepper`, `MaskedInput`, `DiscountInput`, `LoadingView`) foram migrados para o novo design system, mantendo a mesma API pública (sem breaking changes nas telas que os usam).
  - **`HomeScreen` virou um dashboard real** (era um painel de diagnóstico técnico): saudação dinâmica, indicadores de conectividade (`netinfo`) e licença, 3 `StatCard`s (vendido hoje / pedidos emitidos / clientes cadastrados), ação principal "Nova Venda" + atalhos secundários, lista dos últimos 5 pedidos. Ver [docs/05](./05-modulos-telas.md#-dashboard--homescreen-srcscreenshomescreentsx).
  - **Fluxo de Nova Venda redesenhado:** `OrderSelectClientScreen` com `Avatar`; `OrderItemsScreen` com catálogo em cards (grade responsiva 1–2 colunas), barra flutuante inferior fixa (contagem + total + "Avançar") e modal de carrinho — descontos por item removidos desta etapa (movidos para desconto geral único em `OrderReviewScreen`, com `Chip`s de forma de pagamento); nova tela **`OrderSuccessScreen`** ao final, com ícone animado, resumo do pedido e botão "Compartilhar Ordem de Venda (PDF / WhatsApp)".
  - **PDF real implementado** (`templates/orderTemplate.ts` + `services/pdfService.ts`, usando `expo-print`/`expo-sharing` já instalados desde a Fase 1, mas nunca implementados até então — Fase 6 estava com status "Não iniciado"): gera um HTML A4 com cabeçalho, dados do cliente, tabela de itens, totais e observações, convertido em PDF e compartilhado via menu nativo. Chamado a partir de `OrderSuccessScreen` e `OrderDetailScreen` (reemissão).
  - **Telas de Clientes/Produtos/Ordens/Backup/Licença** todas migradas para os novos componentes (`Card`, `Badge`, `Chip`) e paleta — sem mudança de comportamento/regra de negócio, só visual.
  - **Tablet:** `app.json` — `orientation` mudou de `"portrait"` fixo para `"default"` (aceita retrato e paisagem, comportamento recomendado para tablets usados em suporte de mesa). Telas centralizam conteúdo com largura máxima (`maxWidth` local por tela, ex.: 720/820/960px) para não esticar cards de ponta a ponta em telas grandes.
  - **Feedback visual:** sistema de `Toast` (`ToastProvider`, montado em `App.tsx`) para confirmações ("Cliente salvo com sucesso!", "Produto excluído.", ida para o início após emitir pedido); `EmptyState` ganhou ícone ilustrativo por contexto (antes só texto).
- **Escopo desta fase (por pedido explícito do usuário):** o foco foi frontend/UX — nenhuma regra de negócio, schema do WatermelonDB ou fluxo de licenciamento foi alterado. Onde não havia funcionalidade real (PDF), foi implementada de verdade em vez de mockada, por já existir dependência instalada e ser central à demo comercial (módulo #4 do `CLAUDE.md`).
- **Validação:** `tsc --noEmit` sem erros e `expo export --platform android` (bundle Metro completo) sem erros. **Não foi possível validar visualmente em tablet físico/emulador** neste ambiente de desenvolvimento — recomenda-se um passo de QA visual em dispositivo real antes da apresentação ao cliente.
- **Docs afetados:** `docs/01-visao-geral.md`, `docs/02-arquitetura.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

---

## Fase 11 — Tela de Configurações

### 2026-08-25 — `SettingsScreen`: dados da empresa, dispositivo/licença, backup e dados
- **Tipo:** feature / schema
- **Resumo:** Implementada a tela de Configurações (`src/screens/settings/SettingsScreen.tsx`), acessível via ícone de engrenagem no cabeçalho da `HomeScreen`. Três seções:
  1. **Dados da Empresa/Vendedor** — formulário (React Hook Form + Zod) persistido numa nova tabela `company_settings` do WatermelonDB (schema **v2 → v3**, `createTable` — linha única, mesmo padrão de `license_control`; ver [docs/03](./03-banco-de-dados.md#-tabela-company_settings)), via novo `src/services/settingsService.ts`. Campos: razão social/nome, nome fantasia, CNPJ/CPF, IE/IM, telefone, e-mail, endereço estruturado (logradouro/número/bairro/cidade/UF/CEP — nova máscara `maskCep` em `utils/masks.ts`) e chave PIX.
  2. **Sistema e Sobre** — ID do dispositivo (reaproveitado de `licenseService`, **não** gerado via `expo-application`/Android ID — precisa ser o mesmo valor já registrado no Supabase para o suporte conseguir liberar a licença) com botões "Copiar ID" (`expo-clipboard`, nova dependência) e "Enviar por WhatsApp" (novo 2º parâmetro `message` em `utils/whatsapp.ts#openWhatsApp`, novo `EXPO_PUBLIC_SUPPORT_WHATSAPP_PHONE` em `.env`/`services/api.ts`); status de conexão (`useNetInfo`) e de licença (nova leitura passiva `licenseService.getCurrentLicenseSnapshot()` + botão "Verificar Licença Agora" chamando `evaluateLicense()`); versão do app lida de `app.json` via novo `utils/appInfo.ts`.
  3. **Dados, Backup e Armazenamento** — contadores ao vivo de Clientes/Produtos/Ordens (`settingsService.getDatabaseSummary()`); exportação de backup reaproveitando `backupService.exportBackup()` diretamente; importação delega para a `BackupScreen` já existente (evita duplicar o fluxo de prévia/confirmação); "Limpar Pedidos de Teste" (nova `orderService.clearAllOrders()`) protegido por um modal de confirmação customizado (zona de perigo).
- **Decisões que divergiram do pedido original:** não foi usado `expo-application` (Android ID) nem `AsyncStorage`, como sugerido no pedido — ver justificativas nas seções 2 (ID do dispositivo) e 1 (persistência via WatermelonDB, não AsyncStorage, para manter `database/` como única fonte de verdade, consistente com a regra de arquitetura já documentada em [docs/02](./02-arquitetura.md#regra-de-dependência-entre-camadas)) do módulo em [docs/05](./05-modulos-telas.md#️-módulo-configurações).
- **Validação:** `tsc --noEmit` e `expo export --platform android` (bundle Metro completo) sem erros. Sem acesso a dispositivo/emulador físico neste ambiente — recomenda-se testar a migração do schema (v2 → v3) e o fluxo de compartilhamento/WhatsApp num build real antes da entrega.
- **Docs afetados:** `docs/02-arquitetura.md`, `docs/03-banco-de-dados.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`, `.env.example`.

### 2026-08-25 — Seções da tela de Configurações viram accordion recolhível
- **Tipo:** fix / feature
- **Resumo:** A pedido do usuário ("não ficar muito grande a tela"), as 3 seções de `SettingsScreen` passaram a ser recolhíveis. Novo componente `src/components/CollapsibleCard.tsx` (cabeçalho tocável com chevron animado). Comportamento de accordion de seção única: só uma seção fica expandida por vez (abrir uma recolhe a anterior); todas começam recolhidas ao entrar na tela.
- **Docs afetados:** `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

## Fase 12 — Categorias de produtos + remoção do SKU

### 2026-09-01 — Planejamento: categorias no catálogo, SKU removido
- **Tipo:** docs (planejamento da fase, código a seguir na mesma branch)
- **Resumo:** Branch `feature/categorias-produtos-sem-sku`. A pedido do cliente: (1) o campo `sku` do módulo Produtos será removido — considerado complexidade desnecessária para o negócio; (2) produtos passam a pertencer a uma **categoria** (nova tabela `categories`, schema v3 → v4), com tela de gestão (criar/renomear/excluir categoria), seleção obrigatória de categoria no cadastro/edição de produto, e filtro por categoria (chips) na listagem do catálogo.
- **Decisões de design registradas antes da implementação:**
  - `products.category_id` fica **opcional no schema** (para não quebrar produtos cadastrados antes desta fase, que ficam "sem categoria" até serem editados), mas **obrigatório na validação do formulário** para produtos novos/editados.
  - `sku` não é removida via migration (WatermelonDB não tem `removeColumns`) — fica órfã no SQLite em instalações existentes, mesmo padrão já usado na Fase 5 (`total_amount`/`discount`/`total_price`).
  - Backup (`backupService.ts`) passa a exportar/importar categorias por **nome**, não por `id` (um `id` local não faz sentido ao restaurar em outro dispositivo); deduplicação de produtos no backup deixa de ser por `sku` e passa a ser por `name` (case-insensitive), já que o SKU não existe mais.
  - Gestão de categorias (`CategoryListScreen`) não ganhou uma tela de formulário separada — campo de adicionar + edição inline por linha, pela mesma filosofia de simplicidade pedida pelo cliente para o restante do app.
- **Docs afetados nesta entrada:** `docs/03-banco-de-dados.md` (tabela `categories`, `products` sem `sku`/com `category_id`, schema v4, migration v4), `docs/05-modulos-telas.md` (módulo Produtos, `CategoryListScreen`, `OrderItemsScreen`, módulo Backup), `docs/06-changelog-tarefas.md`.
### 2026-09-01 — Implementação: tabela `categories`, filtro no catálogo e remoção do SKU
- **Tipo:** feature / schema
- **Resumo:** Schema **v3 → v4** (`src/database/schema.ts` + `src/database/migrations.ts`): nova tabela `categories` (`name`, `created_at`) via `createTable`; `products` ganhou `category_id` (indexado, opcional) via `addColumns`; a coluna `sku` de `products` foi removida de `schema.ts` (fica órfã no SQLite em instalações já existentes, não é lida pelo app — mesmo padrão da Fase 5). Novo model `src/database/models/Category.ts` (`has_many` para `products`); `Product.ts` perdeu `sku`, ganhou `categoryId?`/relação `belongs_to` `category`.
  - **`CategoryListScreen`** (nova, `src/screens/products/CategoryListScreen.tsx`): campo "Nova categoria" + botão no topo, lista reativa (`withObservables`) abaixo com contagem de produtos por categoria. Edição inline por linha (sem `Alert.prompt`, que não existe no Android) e exclusão bloqueada (com aviso) se algum produto ainda referenciar a categoria. Validação de nome duplicado (case-insensitive) ao criar e ao renomear. Rota `CategoryList` nova em `RootNavigator`.
  - **`ProductFormScreen`:** campo SKU removido; seleção de categoria obrigatória via `Chip`s (`categoryId: z.string().min(1, ...)`), recarregada a cada foco da tela (`useFocusEffect`) para já refletir uma categoria criada na hora; sem nenhuma categoria cadastrada, mostra atalho direto para `CategoryListScreen` em vez de um seletor vazio.
  - **`ProductListScreen`:** busca voltou a ser só por nome (SKU removido); nova linha de `Chip`s roláveis para filtrar por categoria ("Todas" + uma por categoria, some se não houver categorias); ícone de pasta no cabeçalho da lista → `CategoryListScreen`; card do produto mostra o nome da categoria (ou "Sem categoria") em vez do SKU. Observa `products` e `categories` simultaneamente via `withObservables`, resolvendo o nome da categoria por um `Map` local (evita N fetches assíncronos por card).
  - **`OrderItemsScreen`:** referências a SKU removidas (busca e subtítulo do card do catálogo) — filtro por categoria não entrou aqui, escopo do pedido do cliente era só o catálogo (`ProductListScreen`).
  - **`backupService.ts`:** `categories` agora entra no backup, exportada/importada por **nome** (não `id` — um id local não faz sentido em outro dispositivo); produtos trocaram o campo `sku` por `category_name` (opcional). Deduplicação de produtos deixou de ser por `sku` (removido) e passou a ser por `name` (case-insensitive) — mesma lógica agora aplicada a categorias. Na importação, categorias novas são preparadas primeiro (`prepareCreate` já gera o `id` localmente antes do `batch` persistir) para que os produtos do mesmo backup consigam referenciá-las dentro do mesmo `database.batch(...)`. `BackupScreen.tsx` ganhou uma linha extra no preview ("X categoria(s) nova(s)").
- **Decisão que divergiu do planejamento inicial:** nenhuma — implementação seguiu exatamente o desenho registrado na entrada de planejamento acima.
- **Validação:** `tsc --noEmit` sem erros e `expo export --platform android` (bundle Metro completo, 1455 módulos) sem erros. **Não foi possível testar em dispositivo/emulador físico** neste ambiente — recomenda-se validar a migração do schema (v3 → v4) partindo de uma instalação com dados reais (produtos com `sku` preenchido) e o fluxo completo de criar categoria → cadastrar produto → filtrar catálogo → exportar/importar backup, antes do release.
- **Docs afetados:** `docs/03-banco-de-dados.md`, `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### 2026-09-01 — Fix: model `Category` não estava registrado no banco
- **Tipo:** fix
- **Resumo:** `database.get('categories')` retornava `null` (`TypeError: Cannot read property 'query' of null` ao abrir o Catálogo) porque o novo model `Category` foi criado mas nunca adicionado a `modelClasses` em `src/database/index.ts` nem exportado em `src/database/models/index.ts` — passo que existe pra todo model desde a Fase 2, mas ficou de fora na implementação inicial desta fase.
- **Docs afetados:** nenhum (correção pontual, não muda nenhuma regra/schema já documentado).

### 2026-09-01 — Filtro por categoria também no catálogo da Nova Venda
- **Tipo:** feature
- **Resumo:** `OrderItemsScreen` (Passo 2 do fluxo de Nova Venda) ganhou a mesma linha de `Chip`s de filtro por categoria ("Todas" + uma por categoria) já implementada em `ProductListScreen` — a pedido do cliente, que também precisa filtrar por categoria na hora de montar o carrinho, não só na tela de gestão do catálogo. Mesmo padrão de query (`Q.where('category_id', ...)` somado à busca por nome) e mesmo componente reutilizável (`Chip`).
- **Docs afetados:** `docs/05-modulos-telas.md`, `docs/06-changelog-tarefas.md`.

### Tarefas planejadas
- [x] Schema v3 → v4: tabela `categories` (`createTable`) + `products.category_id` (`addColumns`, opcional).
- [x] `src/database/models/Category.ts` (novo) e `Product.ts` sem `sku`, com `categoryId`/relação `category`.
- [x] `CategoryListScreen` (criar/renomear/excluir, com bloqueio de exclusão se houver produto vinculado).
- [x] `ProductFormScreen`: remover campo SKU, adicionar seleção de categoria (chips, obrigatória).
- [x] `ProductListScreen`: remover SKU da busca/exibição, adicionar filtro por categoria (chips) e exibição do nome da categoria.
- [x] `OrderItemsScreen`: remover referências a SKU (busca e exibição no card do catálogo).
- [x] `backupService.ts` (+ `BackupScreen.tsx`): incluir `categories` no backup, trocar dedupe de produto de `sku` para `name`, resolver categoria por nome na importação.
- [x] Validar com `tsc --noEmit` e `expo export --platform android`.
- [ ] Testar em dispositivo/emulador real, partindo de dados pré-existentes (migração v3 → v4) — pendente, sem acesso a device físico neste ambiente.

---

## Processo — Fluxo de branches (`hml` → `main`)

### 2026-09-01 — Adotado fluxo de homologação via branch `hml`
- **Tipo:** chore
- **Resumo:** A partir de agora, `feature/*` deixam de ser mergeadas direto em `main` (produção). Nova branch `hml` (criada a partir de `main`, logo após o merge da Fase 12) passa a ser o destino intermediário: `feature/*` → `hml` (testes de homologação) → `main` (produção). A branch `feature/categorias-produtos-sem-sku` (Fase 12, já mergeada em `main`) foi excluída local e remotamente.
- **Docs afetados:** `docs/02-arquitetura.md` (nova seção "Estratégia de branches"), `docs/06-changelog-tarefas.md`.

---

## 📎 Documentos relacionados

- Visão geral: [docs/01-visao-geral.md](./01-visao-geral.md)
- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
- Banco de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Módulos e telas: [docs/05-modulos-telas.md](./05-modulos-telas.md)
