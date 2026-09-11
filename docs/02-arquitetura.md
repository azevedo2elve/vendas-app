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

`android.package` em `app.json` já é o identificador definitivo (`com.gabrielazevedo.vendasapp`, definido em 2026-09-08 — não muda mais, esse valor é permanente a partir do primeiro APK instalado em qualquer aparelho). Segue pendente só o vínculo com uma conta Expo/EAS de verdade (`eas login`/`eas init`, gera o `extra.eas.projectId` em `app.json`) — não foi feito porque não há acesso a uma conta Expo neste ambiente; é o único passo que só o usuário consegue fazer, quando/se decidir usar o build em nuvem.

### 🖥️ Build local (sem EAS, sem conta) — usado pra gerar o primeiro APK

Como o app depende de código nativo (WatermelonDB), dá pra gerar um APK completamente local, sem conta Expo nenhuma, **desde que a máquina tenha o Android SDK instalado** (Android Studio, ou só o `cmdline-tools` + `platform-tools`/`build-tools`/NDK via `sdkmanager`):

```bash
npx expo prebuild --platform android --clean   # gera/regenera a pasta android/ (gitignored)
cd android
./gradlew assembleDebug     # rápido, assinado com a chave debug padrão — só pra testar que compila

# release de distribuição de verdade — ver flags abaixo
./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  -Pandroid.enableMinifyInReleaseBuilds=true \
  -Pandroid.enableShrinkResourcesInReleaseBuilds=true
```

- **`assembleDebug`** empacota todas as arquiteturas sem compressão (~180-190MB) e inclui ferramentas de dev — serve só pra validar que o ambiente compila, não pra entregar pra ninguém.
- **`assembleRelease`** é o artefato certo pra instalar no celular do cliente (habilitar "fontes desconhecidas" nas configurações do Android pra instalar um `.apk` fora da Play Store). Sem as flags, o template padrão do Expo gera um `.apk` universal (todas as arquiteturas, ~78MB) com R8/shrinkResources desligados. Com as três flags acima — `arm64-v8a` (cobre praticamente todo Android moderno; trocar por `armeabi-v7a` só pra aparelhos bem antigos) + minify + shrinkResources — o mesmo build cai pra **~27MB**, e é a configuração recomendada mesmo fora de qualquer restrição de tamanho (código/recursos não usados removidos de verdade, não é só uma economia de espaço).
- **Assinatura do release:** por padrão, o template do Expo assina o `release` com a mesma chave `debug` (comentário no próprio `android/app/build.gradle`: "Caution! In production, you need to generate your own keystore"). Gerada uma chave de release de verdade em 2026-09-08 (`keytool`, RSA 2048, validade 10.000 dias) — guardada em `/keystore/vendas-app-release.keystore` **na raiz do projeto** (não dentro de `android/`, que é apagada e regenerada a cada `expo prebuild`), com as credenciais em `/keystore.properties`, também na raiz. Ambos no `.gitignore` — nunca vão pro Git, e foram entregues diretamente pro usuário (mesma lógica do `.env`, mas para um segredo ainda mais crítico).
  ```gradle
  // android/app/build.gradle — keystoreProperties lido de ../../keystore.properties (raiz do
  // projeto, fora do android/). Sem esse arquivo, cai pra chave debug automaticamente, sem quebrar.
  def keystorePropertiesFile = rootProject.file("../keystore.properties")
  def keystoreProperties = new Properties()
  if (keystorePropertiesFile.exists()) {
      keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
  }
  // ...dentro de android { }:
  signingConfigs {
      if (keystorePropertiesFile.exists()) {
          release {
              storeFile file(keystoreProperties['storeFile']) // ../../keystore/vendas-app-release.keystore
              storePassword keystoreProperties['storePassword']
              keyAlias keystoreProperties['keyAlias']
              keyPassword keystoreProperties['keyPassword']
          }
      }
  }
  buildTypes {
      release {
          signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug
      }
  }
  ```
  > ⚠️ **`android/app/build.gradle` é regenerado do zero a cada `expo prebuild`** (a pasta inteira é gitignorada, não é código versionado) — só o arquivo da chave (`/keystore/`) e as credenciais (`/keystore.properties`) sobrevivem, por estarem fora de `android/`. **O trecho de código acima precisa ser colado de novo em `android/app/build.gradle` depois de qualquer `expo prebuild --clean` futuro**, antes de rodar `./gradlew assembleRelease` — sem isso, o release volta a ser assinado com a chave debug (não quebra o build, mas gera um APK com assinatura diferente da que já está no aparelho do cliente, impedindo atualizar por cima).
  >
  > **Guardar a chave em local seguro** (gerenciador de senhas, backup privado) — se for perdida, nenhuma atualização futura do app consegue ser instalada por cima da versão já no aparelho do cliente (precisaria desinstalar e reinstalar do zero, perdendo os dados locais dele).

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
│   ├── backupService.ts   # Exportação/Importação JSON (manual, acionado pelo vendedor)
│   ├── remoteBackupService.ts # Backup automático e silencioso (catálogo + vendas 30d) pro Supabase Storage
│   └── settingsService.ts # Dados cadastrais da empresa (company_settings) + resumo de contagens do banco
├── hooks/            # Hooks customizados
│   ├── useLicenseGuard.ts # Bloqueia navegação se licença inválida
│   ├── useRemoteBackupSync.ts # Dispara o backup remoto silencioso (abertura, intervalo, reconexão)
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

**Lint/formatação (Fase 1, configurado em 2026-09-08):** ESLint (`eslint-config-expo`, config flat em `eslint.config.js`) + Prettier (`.prettierrc.json` — aspas simples, ponto e vírgula, `printWidth: 120`, já alinhado ao estilo que o código todo já seguia). Markdown (`docs/`, `CLAUDE.md`) fica fora do Prettier de propósito (`.prettierignore`) — são documentos com tabelas/formatação cuidadosa à mão, reformatação automática só geraria diff sem valor.
```bash
npm run lint           # expo lint (eslint-config-expo)
npm run format          # prettier --write .
npm run format:check    # prettier --check . (usado antes de commit/PR)
```

## 🔌 Pontos de integração externa (mínimos, por design)

O app é offline-first — todas as telas e ações do dia a dia (clientes, produtos, pedidos, PDF) rodam 100% no dispositivo, sem chamada HTTP nenhuma. Só três pontos tocam rede, e nenhum bloqueia o uso do app:

| Integração | Quando é chamada | Serviço responsável |
|---|---|---|
| API de licença (validação/renovação) | Na abertura do app e a cada 5 min enquanto fica aberto (não só perto do vencimento — ver [docs/04](./04-sistema-licenca.md)) | `services/licenseService.ts` |
| Backup remoto automático (Supabase Storage) | Uma vez por dia, se houver internet (silencioso, nunca bloqueia — ver [docs/04](./04-sistema-licenca.md#-backup-remoto-automático-supabase-storage)) | `services/remoteBackupService.ts` |
| Preenchimento automático de cliente (CNPJ/CEP) | Só sob ação explícita do vendedor no `ClientFormScreen` (nunca automático) — Fase 14, 2026-09-11 | `services/cnpjLookupService.ts`, `services/cepLookupService.ts` |

Todo o resto (PDF, compartilhamento, banco de dados) roda 100% no dispositivo, sem chamadas HTTP.

## 🌿 Estratégia de branches

> ✨ Adotada a partir da **Fase 12**. Antes disso, as `feature/*` eram mergeadas direto em `main`.

| Branch | Papel | Ambiente |
|---|---|---|
| `feature/*` | Desenvolvimento de uma feature/fix isolada, a partir de `hml` (ou de `main`, se `hml` ainda não tiver sido criada) | — (local/dev) |
| `hml` | Homologação — recebe o merge de `feature/*` para testes antes de ir para produção | HML |
| `main` | Produção — só recebe merge de `hml` já validada | PRD |

Fluxo: `feature/*` → PR/merge em `hml` → testes de homologação → PR/merge de `hml` em `main`. Branches `feature/*` já mergeadas devem ser excluídas (local e remota) para manter o repositório limpo — o GitHub já faz isso automaticamente ao mergear um PR, nesse repositório.

## 🧪 Estratégia de testes

**Framework:** [Jest](https://jestjs.io/) com o preset [`jest-expo`](https://www.npmjs.com/package/jest-expo) (padrão oficial do Expo — já traz os mocks de módulos nativos e o transform via `babel.config.js` do próprio projeto, então o alias `@/` funciona nos testes sem configuração extra). `npm test` roda a suíte uma vez; `npm run test:watch` fica observando mudanças. Configuração em `package.json` (chave `"jest"`), adotada na Fase 7 (2026-09-08) — primeira suíte real do projeto: `src/services/__tests__/licenseService.test.ts`, cobrindo `evaluateLicense()` (anti-fraude de relógio, validação remota via Supabase — sucesso/`not_registered`/`server_rejected`/falha de rede —, e os três desfechos offline: ativo, `expired` no dia do vencimento, `blocked` após o dia de tolerância).

- **Services** (`licenseService`, e futuramente `pdfService`/`backupService`/`orderService`): unidade, mockando `@/database` por uma "tabela" em memória simples (`jest.mock('@/database', ...)` com um array + `get()/write()` fake) em vez de um adapter SQLite real — mais rápido e suficiente pra testar a regra de negócio em si, já que o WatermelonDB (ORM) não é o que está sendo validado. Dependências externas (`@react-native-community/netinfo`, `expo-crypto`, `@/services/api`, `fetch` global) também são mockadas por teste, controláveis via `jest.fn()`.
- **Nota de tooling:** arquivos de teste precisam de `/// <reference types="jest" />` (e `"node"` quando usam `global`/`process` fora do que já é coberto pelos tipos do RN) no topo — por algum motivo a inclusão automática de pacotes `@types/*` do TypeScript não está pegando esses dois neste projeto (mesmo sem nenhuma restrição explícita via `types`/`typeRoots` no `tsconfig.json` ou em `expo/tsconfig.base`); a referência tripla-barra contorna isso de forma local ao arquivo, sem mexer no `tsconfig.json` global.
- **Models/Schema do WatermelonDB** e **Screens** (React Native Testing Library): ainda não têm suíte própria — ver pendência na Fase 9.

## 📎 Documentos relacionados

- Visão geral do produto: [docs/01-visao-geral.md](./01-visao-geral.md)
- Modelagem de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
