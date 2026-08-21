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
| **Fase 0** | Estruturação inicial e documentação | 🟡 Em andamento |
| **Fase 1** | Setup do projeto (Expo, TypeScript, navegação base) | ⚪ Não iniciado |
| **Fase 2** | Banco de dados local (WatermelonDB: schema, migrations, models) | ⚪ Não iniciado |
| **Fase 3** | Módulo Clientes (CRUD + busca indexada) | ⚪ Não iniciado |
| **Fase 4** | Módulo Produtos (CRUD + filtros) | ⚪ Não iniciado |
| **Fase 5** | Módulo Ordem de Venda (carrinho, cálculo, persistência) | ⚪ Não iniciado |
| **Fase 6** | Geração de PDF e compartilhamento (WhatsApp/e-mail) | ⚪ Não iniciado |
| **Fase 7** | Sistema de Licença Offline (validação, renovação, tela de bloqueio) | ⚪ Não iniciado |
| **Fase 8** | Módulo Backup (exportação/importação JSON) | ⚪ Não iniciado |
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

### Tarefas planejadas
- [ ] Configurar estrutura de pastas conforme [docs/02-arquitetura.md](./02-arquitetura.md).
- [ ] Configurar alias de import `@/` no `tsconfig.json` e `babel.config.js`.
- [ ] Instalar e configurar React Navigation (`native-stack`).
- [ ] Instalar React Hook Form + Zod + `@hookform/resolvers`.
- [ ] Configurar ESLint/Prettier alinhados aos padrões de código descritos em [docs/02-arquitetura.md](./02-arquitetura.md#-padrões-de-código).

---

## Fase 2 — Banco de dados local

### Tarefas planejadas
- [ ] Instalar `@nozbe/watermelondb` e adapter SQLite.
- [ ] Implementar `src/database/schema.ts` conforme [docs/03-banco-de-dados.md](./03-banco-de-dados.md).
- [ ] Implementar models: `Client`, `Product`, `Order`, `OrderItem`, `LicenseControl`.
- [ ] Configurar `src/database/migrations.ts` (schema versão 1).
- [ ] Implementar `hooks/useWatermelonData.ts` para observar queries reativamente.

---

## Fase 3 — Módulo Clientes

### Tarefas planejadas
- [ ] `ClientListScreen` com busca indexada.
- [ ] `ClientFormScreen` com validação Zod (CPF/CNPJ, telefone).
- [ ] Soft delete (`is_active`).

---

## Fase 4 — Módulo Produtos

### Tarefas planejadas
- [ ] `ProductListScreen` com filtros por categoria/busca.
- [ ] `ProductFormScreen` com máscara de preço (BRL) e validação de SKU único.

---

## Fase 5 — Módulo Ordem de Venda

### Tarefas planejadas
- [ ] `NewOrderScreen` (seleção de cliente).
- [ ] `OrderCartScreen` (carrinho com quantidade/desconto por item).
- [ ] `OrderSummaryScreen` (resumo, totais, confirmação e persistência).
- [ ] `OrderHistoryScreen` (histórico de ordens confirmadas).
- [ ] `services/orderCalculationService.ts` com testes unitários dos cálculos.

---

## Fase 6 — PDF e compartilhamento

### Tarefas planejadas
- [ ] `templates/orderTemplate.ts` (HTML do PDF A4).
- [ ] `services/pdfService.ts` (`expo-print` + `expo-sharing`).
- [ ] Testar compartilhamento via WhatsApp e e-mail em dispositivo real (Android/iOS).

---

## Fase 7 — Sistema de Licença Offline

### Tarefas planejadas
- [ ] `services/licenseService.ts` implementando a árvore de decisão de [docs/04-sistema-licenca.md](./04-sistema-licenca.md).
- [ ] `hooks/useLicenseGuard.ts`.
- [ ] `screens/License/LicenseBlockedScreen.tsx`.
- [ ] Integração com `@react-native-community/netinfo`.
- [ ] Testes do anti-fraude de relógio e dos três estados (`active`/`expired`/`blocked`).

---

## Fase 8 — Módulo Backup

### Tarefas planejadas
- [ ] `services/backupService.ts` (exportação JSON via `expo-file-system`).
- [ ] Importação com validação Zod e tela de confirmação pré-import.
- [ ] `BackupScreen` acessível mesmo com licença `expired`.

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
