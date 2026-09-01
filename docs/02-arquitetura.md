# 02 — Arquitetura Técnica

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Framework mobile | **Expo SDK 51+** (React Native, TypeScript) | Runtime, build (EAS), acesso a APIs nativas |
| Linguagem | **TypeScript** | Tipagem estática em todo o projeto (`strict: true`) |
| Persistência local | **WatermelonDB** + adapter SQLite | Banco reativo, offline-first, observável por queries |
| Navegação | **React Navigation** (`@react-navigation/native-stack`) | Pilhas de telas por fluxo (Auth/License, Clients, Products, Orders) |
| PDF | **expo-print** | Renderização de HTML → PDF no dispositivo |
| Compartilhamento | **expo-sharing** | Abre o menu nativo de compartilhamento (WhatsApp, e-mail, etc.) |
| Conectividade | **@react-native-community/netinfo** | Detecta online/offline para o fluxo de renovação de licença |
| Identificação de dispositivo | **expo-crypto** | Gera o `device_id` (UUID v4) usado pela licença, no primeiro uso |
| Validação remota de licença | **Supabase REST (PostgREST)** via `fetch` puro | Consulta a tabela `licenses` para renovar/validar a licença quando o trial local expira — ver [docs/04-sistema-licenca.md](./04-sistema-licenca.md#-integração-com-o-supabase) |
| Build de desenvolvimento | **expo-dev-client** | Necessário pois o WatermelonDB tem módulo nativo e não roda no Expo Go |
| Formulários | **React Hook Form** | Estado e submissão de formulários performática — em uso desde a Fase 3 (`ClientFormScreen`, `ProductFormScreen`) |
| Validação | **Zod** | Schemas de validação integrados ao React Hook Form via `@hookform/resolvers/zod` |
| Persistência reativa em UI | **`@nozbe/watermelondb/react`** (`withObservables`) | Conecta queries observáveis do WatermelonDB a props de componente nas telas de listagem |
| Arquivos (backup) | **expo-file-system** (API nova: `File`/`Directory`/`Paths`, não a legada `FileSystem.*`) | Escreve o JSON de backup e abre o seletor nativo de arquivos para importar — sem depender de `expo-document-picker`, redundante com `File.pickFileAsync` |
| Ícones | **@expo/vector-icons** (`Ionicons`) | Biblioteca de ícones mantida pela Expo, sem configuração nativa adicional — substituiu os emojis/glifos de texto usados como placeholder de ícone nas primeiras fases |
| Área de transferência | **expo-clipboard** | Copiar o ID do dispositivo na tela de Configurações (`Clipboard.setStringAsync`) |

> ⚠️ Nota de versão: o `package.json` atual do projeto está em **Expo ~57 / React Native 0.86 / React 19**. O `CLAUDE.md` referencia "Expo SDK 51+" como piso mínimo de compatibilidade das APIs usadas (expo-print, expo-sharing, netinfo) — a stack real instalada é mais recente. Sempre confira `package.json` como fonte da verdade da versão exata em uso.

## 🎨 Design System (`src/theme/`)

Fase 10 introduziu um design system centralizado, substituindo os valores de cor/espaçamento hardcoded que estavam espalhados (copiados e colados) em cada `StyleSheet.create` das telas:

| Arquivo | Conteúdo |
|---|---|
| `src/theme/colors.ts` | Paleta única (`colors.*`) — navy/slate (primária), azul royal (`accent`, ações), verde esmeralda (`success`, valores monetários), âmbar (`warning`), vermelho (`danger`), superfícies/bordas/texto |
| `src/theme/spacing.ts` | Escala de espaçamento (`spacing.xxs`…`spacing.huge`) e raios de borda (`radii.sm`…`radii.pill`) |
| `src/theme/typography.ts` | Presets de texto (`typography.h1`, `typography.body`, `typography.money`, etc.) |
| `src/theme/shadows.ts` | Sombras padronizadas (`shadows.card`/`raised`/`floating`), com `Platform.select` para `elevation` (Android) vs. `shadow*` (iOS) |
| `src/theme/layout.ts` | Larguras máximas de conteúdo (`CONTENT_MAX_WIDTH`, `WIDE_CONTENT_MAX_WIDTH`) usadas para centralizar telas em tablets grandes, evitando cards esticados de ponta a ponta |
| `src/theme/index.ts` | Barrel export — importar sempre via `import { colors, spacing, radii, ... } from '@/theme'` |

Não há um `ThemeProvider`/Context — os tokens são objetos estáticos importados diretamente nos `StyleSheet.create` de cada tela/componente (suficiente para um único tema claro; um `ThemeProvider` só se justificaria se o app ganhasse dark mode ou temas por cliente).

### Componentes de UI reutilizáveis (`src/components/`)

Além dos componentes de formulário já existentes (`MaskedInput`, `DiscountInput`, `SearchBar`, `Fab`, `PrimaryButton`, `QuantityStepper`, `LoadingView`, `EmptyState`), a Fase 10 adicionou:

| Componente | Uso |
|---|---|
| `Card` | Container de superfície padrão (fundo branco, borda sutil, cantos arredondados) — substitui os `styles.card` duplicados em cada tela |
| `Badge` | Etiqueta de status colorida (`tone`: `success`/`warning`/`danger`/`neutral`/`info`/`accent`) — usada para status de pedido (`ORDER_STATUS_TONE` em `types/database.ts`) |
| `Chip` | Pílula selecionável (filtros de status, forma de pagamento, unidade de produto) — substitui os `TouchableOpacity` de chip duplicados |
| `Avatar` | Círculo com iniciais do nome do cliente, cor determinada por hash do nome (determinística, sem estado) |
| `StatCard` | Card de métrica do dashboard (ícone + valor + label) |
| `SectionHeader` | Título de seção com ação opcional à direita (ex: "Ver todos") |
| `Toast` (`ToastProvider`/`useToast`) | Sistema de notificação flutuante (sucesso/erro/info), montado uma vez em `App.tsx` acima do `RootNavigator` — usado para confirmações como "Cliente salvo com sucesso!" |
| `OrderProgressBar` | Indicador de progresso do fluxo de 3 etapas de Nova Venda (Cliente → Itens → Fechamento) |

> A centralização de conteúdo com largura máxima em telas largas (tablet) é feita hoje com um wrapper `View` local (`maxWidth` + `alignSelf: 'center'`) direto no `StyleSheet` de cada tela, não por um componente `ScreenContainer` compartilhado — os valores de `maxWidth` variam por tipo de tela (formulário estreito vs. listagem larga) e a divergência de padding entre telas não justificou ainda a abstração.

## 🧱 Por que WatermelonDB?

WatermelonDB foi escolhido em vez de alternativas (AsyncStorage puro, Realm, expo-sqlite cru) por:
- **Reatividade nativa:** queries são observáveis — componentes re-renderizam automaticamente quando os dados mudam, sem gerenciamento manual de estado global para listas.
- **Performance em listas grandes:** lazy loading e paginação eficientes, importante para bases de clientes/produtos que crescem com o tempo.
- **Modelo relacional real:** suporta relações (`@relation`, `@children`) entre `orders`, `order_items`, `clients` e `products` de forma tipada.
- **SQLite por baixo:** dados ficam em um arquivo `.db` local, robusto e testado, sem depender de serialização manual em JSON para todo acesso.

## ⚙️ Configuração de build necessária para o WatermelonDB

WatermelonDB depende de código nativo (módulo JSI, resolvido automaticamente pelo Metro via `adapters/sqlite/makeDispatcher/index.native.js`), então duas configurações de projeto são obrigatórias:

1. **`babel.config.js`** — os decorators do WatermelonDB (`@field`, `@date`, `@relation`, `@children`, etc.) usam a sintaxe *legacy* de decorators. Isso exige, nesta ordem:
   - `['@babel/plugin-transform-typescript', { isTSX: true, allowDeclareFields: true }]` **antes** do plugin de decorators — se não vier primeiro, o transform de TypeScript embutido no `babel-preset-expo` roda depois do transform de decorators e rejeita campos `declare`/`!` que os decorators já inicializaram.
   - `['@babel/plugin-proposal-decorators', { legacy: true }]`.
   - Nos models, os campos decorados usam `declare` (ex: `@field('name') declare name: string;`), não `!` — combinação exigida pelo `allowDeclareFields: true` acima.
   - Alias `@/*` → `src/*` resolvido em runtime por `babel-plugin-module-resolver` (o `tsconfig.json` só cobre o type-check do `tsc`; o Metro desta versão do Expo não lê `paths` do tsconfig automaticamente).
2. **`tsconfig.json`** — `experimentalDecorators: true` (para o `tsc` aceitar a sintaxe) e `paths: { "@/*": ["./src/*"] }` (sem `baseUrl`, deprecado a partir do TypeScript 6 — `paths` sozinho já resolve relativo ao `tsconfig.json` com `moduleResolution: "bundler"`).
3. **Sem Expo Go:** por ter módulo nativo, o app não roda no app Expo Go da loja. É preciso `expo-dev-client` + `expo prebuild` + `expo run:android`/`expo run:ios` para gerar um build de desenvolvimento próprio.

## 🏗️ Build (EAS)

`eas.json` (Fase 9) define 3 perfis de build (`eas build --profile <nome>`), pensados especificamente pro fato do app depender de código nativo (WatermelonDB — ver seção acima):

| Perfil | Uso | Distribuição |
|---|---|---|
| `development` | Gera o dev client com código nativo já embutido (`developmentClient: true`) — necessário porque o app não roda no Expo Go. É o build que se instala uma vez no aparelho/emulador e depois recebe atualizações de JS via `expo start` normalmente. | `internal` (APK direto, sem passar pela loja) |
| `preview` | Build "de verdade" (sem o client de dev) pra testar em dispositivo físico antes de liberar — ex: mandar pro cliente avaliar. | `internal` (APK) |
| `production` | Build final para a loja (`autoIncrement: true` — incrementa o `versionCode`/`buildNumber` automaticamente a cada build, sem precisar editar `app.json` na mão). | Loja (via `eas submit`, perfil `production` também configurado) |

> ⚠️ **Pendências antes do primeiro build real:** (1) `eas.json` sozinho não basta — é preciso rodar `eas login`/`eas init` (ou `eas build:configure`) pra vincular o projeto a uma conta Expo/EAS e gerar o `extra.eas.projectId` em `app.json`, passo que não foi feito aqui (sem acesso a uma conta Expo neste ambiente). (2) `android.package` em `app.json` ainda está com o valor padrão do template (`com.anonymous.vendasapp`) — trocar para o identificador definitivo da empresa antes de submeter à Play Store, já que esse valor não pode mais mudar depois do primeiro upload.

## 🔑 Variáveis de ambiente

Config de serviços externos (hoje só o Supabase, ver [docs/04-sistema-licenca.md](./04-sistema-licenca.md#-integração-com-o-supabase)) fica em variáveis com prefixo `EXPO_PUBLIC_`, que o Metro inlineia automaticamente no bundle (suporte nativo do Expo, sem lib adicional). Centralizadas em `src/services/api.ts`, nunca lidas diretamente de `process.env` no resto do código.
- `.env` (não versionado, no `.gitignore`) tem os valores reais usados localmente.
- `.env.example` (versionado) documenta as chaves esperadas.
- Só valores seguros para o cliente (chaves `anon`/`publishable`, protegidas por RLS no backend) entram aqui — nunca uma `service_role key` ou outro segredo de servidor.

## 📁 Estrutura de Diretórios

```text
src/
├── database/        # Schemas, migrations e models do WatermelonDB
│   ├── schema.ts         # Definição das tabelas e colunas (appSchema)
│   ├── migrations.ts     # Migrations incrementais de schema
│   └── models/            # Classes Model (Client, Product, Order, OrderItem, LicenseControl)
├── theme/            # Design system: cores, espaçamento, tipografia, sombras, layout (ver seção acima)
├── components/       # Componentes reutilizáveis de UI (Card, Badge, Chip, Avatar, PrimaryButton, EmptyState, Toast...)
├── screens/          # Telas organizadas por fluxo
│   ├── License/           # Tela de bloqueio/renovação de licença
│   ├── clients/            # Lista, cadastro e edição de clientes
│   ├── products/           # Lista, cadastro e edição de produtos
│   ├── orders/             # Nova ordem (wizard 3 etapas + sucesso), carrinho, resumo, histórico
│   ├── backup/             # Exportação/Importação JSON
│   └── settings/           # Configurações: empresa/vendedor, dispositivo/licença, backup, dados
├── services/         # Lógica de negócio isolada da UI
│   ├── licenseService.ts  # Validação/renovação de licença
│   ├── orderService.ts    # Criação/atualização/exclusão de ordens de venda
│   ├── pdfService.ts       # Geração do HTML/PDF da ordem de venda + compartilhamento (expo-print/expo-sharing)
│   ├── backupService.ts   # Exportação/Importação JSON
│   └── settingsService.ts # Dados cadastrais da empresa (company_settings) + resumo de contagens do banco
├── hooks/            # Hooks customizados
│   ├── useLicenseGuard.ts # Bloqueia navegação se licença inválida
│   └── useOrderDraft.tsx  # Estado do carrinho/rascunho de ordem via Context, compartilhado entre as 3 telas do wizard
├── navigation/       # Stacks e rotas (RootNavigator, OrderDraftNavigator, tipos de rota)
├── templates/        # Template HTML para expo-print (Ordem de Venda A4) — orderTemplate.ts
├── types/            # Interfaces e definições TypeScript compartilhadas
└── utils/            # Funções puras (máscaras, validadores, formatação) sem estado ou I/O
```

> 📁 Nomes reais de pastas em `screens/` usam `camelCase`/lowercase (`clients/`, `products/`, `License/`) — o `Clients/`/`Products/` acima é ilustrativo do `CLAUDE.md` original.

### Regra de dependência entre camadas

```text
screens/  ──depende de──>  hooks/ ──depende de──>  services/ ──depende de──>  database/
    │                                                                              ▲
    └──────────────────────> components/ ─────────────────────────────────────────┘
                                (apenas UI pura, sem acesso direto ao database/)
```

> 🚧 **Exceção deliberada (Fase 3):** as telas de listagem (`ClientListScreen`, `ProductListScreen`) acessam `database` diretamente para montar a query observável usada com `withObservables` — não passam por `hooks/`/`services/`. Isso é o padrão idiomático do WatermelonDB (a query observável fica colocada junto do componente que a usa) e não um `useWatermelonData.ts` genérico, que acabou não sendo criado (ver decisão em [docs/06](./06-changelog-tarefas.md)). Regras de negócio de fato (validação de duplicidade, cálculos) continuam vivendo nos arquivos das telas de formulário por enquanto — considerar extrair para `services/` se crescerem além do CRUD simples.

- `components/` **não** deve importar `database/` diretamente — recebe dados via props.
- `screens/` **não** deve conter lógica de negócio complexa — delega a `services/` e `hooks/`.
- `services/` é a única camada que deve orquestrar regras de negócio (ex.: cálculo de totais, validação de licença).
- `database/` é acessada por `services/`/`hooks/`, nunca diretamente por `screens/`.

## 🎨 Padrões de código

| Item | Convenção |
|---|---|
| Nomes de arquivo de tela | `PascalCase` + sufixo `Screen` (ex: `ClientListScreen.tsx`) |
| Nomes de componente | `PascalCase` (ex: `ProductCard.tsx`) |
| Nomes de hook | `camelCase` com prefixo `use` (ex: `useLicenseGuard.ts`) |
| Nomes de service | `camelCase` com sufixo `Service` (ex: `pdfService.ts`) |
| Models do WatermelonDB | `PascalCase` singular (ex: `class Client extends Model`) |
| Tipos/Interfaces | `PascalCase`, prefixo `I` **não** obrigatório (preferir nomes descritivos: `Client`, `OrderPayload`) |
| Validação de formulário | Schema Zod colocado perto do formulário ou em `types/` quando reutilizado |
| Imports | Absolutos via alias `@/` apontando para `src/` (configurado em `tsconfig.json` + `babel.config.js`) |
| Estilo | `StyleSheet.create` por componente/tela; evitar estilos inline exceto casos triviais |

## 🔌 Pontos de integração externa (mínimos, por design)

O app é offline-first, então há apenas **um** ponto de rede real no sistema:

| Integração | Quando é chamada | Serviço responsável |
|---|---|---|
| API de licença (renovação) | Somente quando `agora >= license_expires_at` | `services/licenseService.ts` |

Todo o resto (PDF, compartilhamento, banco de dados) roda 100% no dispositivo, sem chamadas HTTP.

## 🌿 Estratégia de branches

> ✨ Adotada a partir da **Fase 12**. Antes disso, as `feature/*` eram mergeadas direto em `main`.

| Branch | Papel | Ambiente |
|---|---|---|
| `feature/*` | Desenvolvimento de uma feature/fix isolada, a partir de `hml` (ou de `main`, se `hml` ainda não tiver sido criada) | — (local/dev) |
| `hml` | Homologação — recebe o merge de `feature/*` para testes antes de ir para produção | HML |
| `main` | Produção — só recebe merge de `hml` já validada | PRD |

Fluxo: `feature/*` → PR/merge em `hml` → testes de homologação → PR/merge de `hml` em `main`. Branches `feature/*` já mergeadas devem ser excluídas (local e remota) para manter o repositório limpo — o GitHub já faz isso automaticamente ao mergear um PR, nesse repositório.

## 🧪 Estratégia de testes (diretriz)

- **Services** (`licenseService`, `pdfService`, `backupService`): unidade, com foco em regras de negócio puras (cálculo de totais, regras de data da licença, geração do payload do PDF).
- **Models/Schema do WatermelonDB**: testes de integração usando o adapter SQLite em memória.
- **Screens**: testes de fluxo (React Native Testing Library) para os caminhos críticos: criar ordem, gerar PDF, tela de bloqueio de licença.

## 📎 Documentos relacionados

- Visão geral do produto: [docs/01-visao-geral.md](./01-visao-geral.md)
- Modelagem de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
