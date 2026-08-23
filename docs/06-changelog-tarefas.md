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
| **Fase 6** | Geração de PDF e compartilhamento (WhatsApp/e-mail) | ⚪ Não iniciado |
| **Fase 7** | Sistema de Licença Offline (validação, renovação, tela de bloqueio) | 🟡 Em andamento (`licenseService` + `useLicenseGuard` + `LicenseBlockedScreen` prontos; acesso somente-leitura em `expired` depende das Fases 3/4/8) |
| **Fase 8** | Módulo Backup (exportação/importação JSON) | 🟡 Em andamento (Clientes + Produtos prontos; falta incluir `orders`/`order_items` agora que a Fase 5 existe; acesso mesmo com licença `expired` ainda não implementado) |
| **Fase 9** | Polimento, testes e preparação para build (EAS) | ⚪ Não iniciado |

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

### Tarefas planejadas
- [ ] `templates/orderTemplate.ts` (HTML do PDF A4).
- [ ] `services/pdfService.ts` (`expo-print` + `expo-sharing`).
- [ ] Testar compartilhamento via WhatsApp e e-mail em dispositivo real (Android/iOS).

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
- [ ] Revisão de UX em telas críticas (carrinho, bloqueio de licença).
- [ ] Configuração de build via EAS (`eas.json`).
- [ ] Checklist final de conformidade com `docs/` antes do release.

## 📎 Documentos relacionados

- Visão geral: [docs/01-visao-geral.md](./01-visao-geral.md)
- Arquitetura: [docs/02-arquitetura.md](./02-arquitetura.md)
- Banco de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
- Módulos e telas: [docs/05-modulos-telas.md](./05-modulos-telas.md)
