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
| Formulários | **React Hook Form** | Estado e submissão de formulários performática |
| Validação | **Zod** | Schemas de validação integrados ao React Hook Form (`@hookform/resolvers/zod`) |

> ⚠️ Nota de versão: o `package.json` atual do projeto está em **Expo ~57 / React Native 0.86 / React 19**. O `CLAUDE.md` referencia "Expo SDK 51+" como piso mínimo de compatibilidade das APIs usadas (expo-print, expo-sharing, netinfo) — a stack real instalada é mais recente. Sempre confira `package.json` como fonte da verdade da versão exata em uso.

## 🧱 Por que WatermelonDB?

WatermelonDB foi escolhido em vez de alternativas (AsyncStorage puro, Realm, expo-sqlite cru) por:
- **Reatividade nativa:** queries são observáveis — componentes re-renderizam automaticamente quando os dados mudam, sem gerenciamento manual de estado global para listas.
- **Performance em listas grandes:** lazy loading e paginação eficientes, importante para bases de clientes/produtos que crescem com o tempo.
- **Modelo relacional real:** suporta relações (`@relation`, `@children`) entre `orders`, `order_items`, `clients` e `products` de forma tipada.
- **SQLite por baixo:** dados ficam em um arquivo `.db` local, robusto e testado, sem depender de serialização manual em JSON para todo acesso.

## 📁 Estrutura de Diretórios

```text
src/
├── database/        # Schemas, migrations e models do WatermelonDB
│   ├── schema.ts         # Definição das tabelas e colunas (appSchema)
│   ├── migrations.ts     # Migrations incrementais de schema
│   └── models/            # Classes Model (Client, Product, Order, OrderItem, LicenseControl)
├── components/       # Componentes reutilizáveis de UI (Button, Input, CartItem, EmptyState...)
├── screens/          # Telas organizadas por fluxo
│   ├── License/           # Tela de bloqueio/renovação de licença
│   ├── Clients/            # Lista, cadastro e edição de clientes
│   ├── Products/           # Lista, cadastro e edição de produtos
│   └── Orders/             # Nova ordem, carrinho, resumo, histórico
├── services/         # Lógica de negócio isolada da UI
│   ├── licenseService.ts  # Validação/renovação de licença
│   ├── pdfService.ts       # Geração do HTML/PDF da ordem de venda
│   └── backupService.ts   # Exportação/Importação JSON
├── hooks/            # Hooks customizados
│   ├── useLicenseGuard.ts # Bloqueia navegação se licença inválida
│   └── useWatermelonData.ts # Observa queries do WatermelonDB em componentes
├── navigation/       # Stacks e rotas (RootNavigator, tipos de rota)
├── templates/        # Template HTML para expo-print (Ordem de Venda A4)
└── types/            # Interfaces e definições TypeScript compartilhadas
```

### Regra de dependência entre camadas

```text
screens/  ──depende de──>  hooks/ ──depende de──>  services/ ──depende de──>  database/
    │                                                                              ▲
    └──────────────────────> components/ ─────────────────────────────────────────┘
                                (apenas UI pura, sem acesso direto ao database/)
```

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

## 🧪 Estratégia de testes (diretriz)

- **Services** (`licenseService`, `pdfService`, `backupService`): unidade, com foco em regras de negócio puras (cálculo de totais, regras de data da licença, geração do payload do PDF).
- **Models/Schema do WatermelonDB**: testes de integração usando o adapter SQLite em memória.
- **Screens**: testes de fluxo (React Native Testing Library) para os caminhos críticos: criar ordem, gerar PDF, tela de bloqueio de licença.

## 📎 Documentos relacionados

- Visão geral do produto: [docs/01-visao-geral.md](./01-visao-geral.md)
- Modelagem de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Sistema de licença: [docs/04-sistema-licenca.md](./04-sistema-licenca.md)
