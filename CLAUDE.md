# Contexto do Projeto: Força de Vendas Offline (React Native + Expo)

## 📌 Visão Geral
Aplicativo mobile focado em força de vendas para microempreendedores. O app opera **100% offline**, persistindo dados localmente e emitindo ordens de venda em PDF compartilháveis via WhatsApp e e-mail.

---

## 🛠️ Stack Tecnológica
- **Framework:** React Native com Expo SDK 51+ (TypeScript)
- **Banco de Dados Local:** WatermelonDB com SQLite Adapter
- **Navegação:** React Navigation (`@react-navigation/native-stack`)
- **PDF & Compartilhamento:** `expo-print` e `expo-sharing`
- **Rede & Conectividade:** `@react-native-community/netinfo`
- **Formulários & Validação:** React Hook Form + Zod

---

## 🔒 Regras de Negócio Críticas

### 1. Sistema de Licença Offline com Renovação no Vencimento
- **Campos Locais:** `device_id` (UUID), `license_expires_at` (ISO timestamp), `license_status` ('active' | 'expired' | 'blocked'), `last_opened_at` (ISO timestamp).
- **Validação contínua (atualizado 2026-09-01):** o app tenta validar a licença com o servidor sempre que possível — na abertura e a cada 5 minutos enquanto fica aberto — mesmo com `agora` bem antes de `license_expires_at`. Sem internet, isso nunca gera erro nem bloqueia por si só: o app segue funcionando 100% offline normalmente enquanto `license_expires_at` for hoje ou uma data futura.
- **Chegada do Vencimento:** Quando `agora >= license_expires_at`:
  - **Com internet:** Faz fetch na API de licença; se validar, atualiza o novo `license_expires_at` e segue operando; se a validação vier negativa (dispositivo não cadastrado ou licença recusada), bloqueia.
  - **Sem internet, ainda no mesmo dia do vencimento:** segue em modo somente leitura (não bloqueia).
  - **Sem internet, e já passou pelo menos 1 dia inteiro desde o vencimento:** bloqueia a emissão de pedidos e apresenta tela de bloqueio com aviso e botão de retry.
- **Anti-fraude de relógio:** Se a data atual for menor que `last_opened_at`, bloqueia imediatamente.

### 2. Módulos do Sistema
1. **Clientes:** Cadastro local (Nome, CPF/CNPJ, Telefone/WhatsApp, Endereço) com busca indexada.
2. **Produtos:** Cadastro local (Nome, SKU, Preço de venda em BRL, Unidade de medida) com filtros.
3. **Ordem de Venda:** Seleção de cliente -> Carrinho de produtos (quantidade + desconto) -> Resumo com totais -> Persistência local no WatermelonDB.
4. **PDF & WhatsApp:** Geração de documento PDF em formato A4 profissional (com tabela de itens e totais) disparado diretamente via menu nativo de compartilhamento.
5. **Backup:** Exportação/Importação local em formato JSON.

---

## 📁 Padrão de Arquitetura de Pastas
```text
src/
├── database/        # Schemas, migrations e models do WatermelonDB
├── components/      # Componentes reutilizáveis de UI
├── screens/         # Telas organizadas por fluxo (Auth/License, Clients, Products, Orders)
├── services/        # licenseService, pdfService, backupService
├── hooks/           # useLicenseGuard, useWatermelonData
├── navigation/      # Stacks e rotas
├── templates/       # Template HTML para expo-print (Ordem de Venda A4)
└── types/           # Interfaces e definições TypeScript@AGENTS.md

---

## 📚 Diretrizes de Documentação (Pasta /docs)
- A pasta `docs/` é a fonte da verdade sobre arquitetura, schemas e regras de negócio. Ela deve refletir sempre o estado **atual** do código — nunca deixe a documentação divergir da implementação.
- **Regra Obrigatória de Atualização Contínua:** a documentação em `docs/` deve ser mantida sempre atualizada nos seguintes gatilhos:
  1. **Ao criar uma nova branch:** antes de iniciar o trabalho, revise se os documentos relevantes ao escopo da branch já refletem o estado atual; ao finalizar a branch (antes do merge/PR), atualize os documentos afetados pelas mudanças feitas.
  2. **A cada alteração de código relevante:** nova feature, alteração de schema do WatermelonDB, mudança na regra de licenciamento, nova tela/módulo, ou conclusão de tarefa — sempre:
     - Atualize o(s) arquivo(s) correspondente(s) em `docs/` (ex: `docs/03-banco-de-dados.md` para schemas, `docs/04-sistema-licenca.md` para regras de licença, `docs/05-modulos-telas.md` para telas).
     - Registre a mudança com data (formato `AAAA-MM-DD`) e resumo objetivo em `docs/06-changelog-tarefas.md`.
  3. **Nunca abra ou finalize um PR com `docs/` desatualizada** em relação às mudanças de código incluídas nele.
