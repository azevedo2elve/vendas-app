# 04 — Sistema de Licença Offline

## 📌 Objetivo

Permitir que o app funcione **100% offline no dia a dia**, mas garantir que, periodicamente, o dispositivo precise "reportar-se" (com internet) para renovar sua licença de uso — impedindo uso indefinido sem controle, sem exigir conexão constante.

## 🗄️ Estado local (tabela `license_control`)

Ver schema completo em [docs/03-banco-de-dados.md](./03-banco-de-dados.md#-tabela-license_control). Campos:

| Campo | Descrição |
|---|---|
| `device_id` | UUID v4 gerado via `expo-crypto` (`Crypto.randomUUID()`) na primeira execução do app, persistido localmente. Identifica o dispositivo perante a API de licença. |
| `license_expires_at` | Timestamp de quando a licença atual expira. |
| `license_status` | `'active'` \| `'expired'` \| `'blocked'`. |
| `last_opened_at` | Timestamp da última vez que o app foi aberto com sucesso. Base do anti-fraude de relógio. |

### Bootstrap (primeira execução, sem registro em `license_control`)

Quando o app abre pela primeira vez e a tabela `license_control` ainda está vazia, `licenseService.ts` cria o registro automaticamente com:
- `device_id`: novo UUID v4.
- `license_status`: `'active'`.
- `license_expires_at`: `agora + 15 dias` (constante `TRIAL_PERIOD_MS` em `licenseService.ts`) — um período de teste local, sem contato com o servidor, para o vendedor já poder usar o app antes de qualquer ativação remota.
- `last_opened_at`: `agora`.

Esse período de trial é uma decisão de implementação (não estava especificado no `CLAUDE.md`); ajuste `TRIAL_PERIOD_MS` se o negócio definir um valor oficial diferente.

> ⚠️ **Por que o bootstrap não consulta o Supabase:** o `device_id` é um UUID v4 gerado aleatoriamente no próprio dispositivo na primeira execução — ele não pode, por definição, já existir na tabela `licenses` do Supabase nesse exato momento (ninguém o conhece antes do app gerá-lo). Por isso a validação remota só entra em ação mais tarde, quando `agora >= license_expires_at` (fim do trial) — ver árvore de decisão abaixo. Para o vendedor ter uma licença de verdade (não o trial), alguém do time de suporte precisa cadastrar o `device_id` exibido em [HomeScreen](../src/screens/HomeScreen.tsx) (ou na [tela de bloqueio](../src/screens/License/LicenseBlockedScreen.tsx)) na tabela `licenses` do Supabase.

## 🧠 Regra de decisão (executada a cada abertura do app)

A lógica vive em `services/licenseService.ts` (função `evaluateLicense()`) e é consumida pelo hook `hooks/useLicenseGuard.ts`, que roda antes de liberar a navegação para qualquer tela de negócio (ver `navigation/RootNavigator.tsx`).

### Detalhe da checagem de conectividade e do erro de renovação

- **Online** = `NetInfo.fetch()` retorna `isConnected === true` **e** `isInternetReachable !== false` (trata o estado "ainda não determinado" (`null`) como tentativa válida, em vez de bloquear precocemente).
- Se o Supabase não estiver configurado (`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` ausentes) o app nem tenta a chamada — trata como se estivesse offline (`expired`/`offline`, com retry).
- Se o fetch ao Supabase falhar por **erro de rede/timeout** (ex: `TypeError` antes de obter resposta), o resultado é tratado como **`expired`/offline** — não como `blocked` — pois não houve uma recusa explícita do servidor.
- Se o Supabase **responder** com erro HTTP (ex: `401`/`403` por chave inválida, RLS negando a linha), o resultado é `blocked` com `reason: 'server_rejected'`.
- Se o Supabase responder OK mas com **array vazio** (nenhuma linha para esse `device_id`), o resultado é `blocked` com `reason: 'not_registered'` — dispositivo não cadastrado no sistema de licenças.
- Se a linha encontrada tiver `license_status` diferente de `'active'` (ex: `'blocked'` ou `'expired'` definidos manualmente no Supabase), o resultado também é `blocked` com `reason: 'server_rejected'`.
- Em qualquer resultado, o `device_id` do dispositivo é retornado por `evaluateLicense()` e exibido na tela (para poder ser repassado ao suporte).

```text
agora = Date.now()

1. ANTI-FRAUDE DE RELÓGIO
   SE agora < last_opened_at:
       → license_status = 'blocked'
       → Bloqueia IMEDIATAMENTE (sem tentar renovar)
       → Motivo: relógio do dispositivo foi voltado manualmente
                 para burlar a expiração da licença.

2. LICENÇA AINDA VÁLIDA
   SENÃO SE agora < license_expires_at:
       → App funciona 100% OFFLINE, sem chamadas de rede
       → Atualiza last_opened_at = agora
       → Libera navegação normalmente

3. LICENÇA VENCIDA → precisa validar renovação
   SENÃO (agora >= license_expires_at):
       → Verifica conectividade (NetInfo) e se o Supabase está configurado

       SE HÁ INTERNET E SUPABASE CONFIGURADO:
           → GET {SUPABASE_REST_URL}/licenses?device_id=eq.{deviceId}
                &select=device_id,license_expires_at,license_status
             headers: apikey / Authorization: Bearer <anon key>

           → SE encontrou uma linha E license_status === 'active':
                → Atualiza license_expires_at (valor retornado pelo Supabase)
                → license_status = 'active'
                → Atualiza last_opened_at = agora
                → Libera navegação

           → SE encontrou uma linha COM license_status ('blocked' ou 'expired'):
                → license_status = 'blocked'  (reason: 'server_rejected')
                → Exibe tela de bloqueio

           → SE array vazio (device_id não cadastrado no Supabase):
                → license_status = 'blocked'  (reason: 'not_registered')
                → Exibe tela de bloqueio com o device_id, para repassar ao suporte

           → SE erro HTTP do Supabase (ex: 401/403):
                → license_status = 'blocked'  (reason: 'server_rejected')

       SE NÃO HÁ INTERNET, OU SUPABASE NÃO CONFIGURADO, OU FALHA DE REDE/TIMEOUT:
           → license_status = 'expired'  (reason: 'offline')
           → Bloqueia emissão de pedidos
           → Exibe tela de bloqueio com aviso + botão de retry
```

## 🔄 Diagrama de estados

```text
                 ┌─────────────┐
        ┌───────▶│   active    │◀───────────────┐
        │        └─────────────┘                │
        │               │                        │
        │      agora >= license_expires_at        │ renovação OK
        │               │                        │ (com internet)
        │               ▼                        │
        │        ┌─────────────┐        tenta renovar
        │        │  (checando  │────────────────┘
        │        │  renovação) │
        │        └─────────────┘
        │               │
        │      sem internet / falha
        │               │
        │               ▼
        │        ┌─────────────┐
        │        │   expired   │──── botão "Tentar novamente" ───┐
        │        └─────────────┘                                 │
        │                                                          │
        │   relógio voltado (agora < last_opened_at)              │
        │   OU backend recusa a licença                            │
        │               │                                          │
        │               ▼                                          │
        │        ┌─────────────┐                                  │
        └────────│   blocked   │◀─────────────────────────────────┘
                  └─────────────┘
```

## 🚫 O que fica bloqueado quando a licença não está `active`

| Ação | `expired` (sem internet) | `blocked` |
|---|---|---|
| Visualizar clientes/produtos cadastrados | ✔️ Permitido (somente leitura) | ⛔ Bloqueado |
| Criar/editar cliente ou produto | ⛔ Bloqueado | ⛔ Bloqueado |
| Emitir nova ordem de venda | ⛔ Bloqueado | ⛔ Bloqueado |
| Gerar/compartilhar PDF | ⛔ Bloqueado | ⛔ Bloqueado |
| Exportar backup | ✔️ Permitido (o vendedor não pode perder dados) | ✔️ Permitido |
| Botão de retry de renovação | ✔️ Visível | ✔️ Visível (mas backend pode recusar de novo) |

> A decisão de permitir leitura + backup em `expired` (mas nunca em `blocked`) evita que o vendedor perca acesso aos próprios dados por estar temporariamente sem internet, mas impede a operação normal do negócio (emissão de pedidos) até a renovação.

> 🚧 **Status desta fase (setup de arquitetura):** os módulos Clientes/Produtos/Backup ainda não existem, então `RootNavigator` hoje só decide entre "tela de negócio" (uma `HomeScreen` de diagnóstico) e `LicenseBlockedScreen` — não há, ainda, o acesso somente-leitura em modo `expired` descrito na tabela acima. Implementar essa distinção fica para quando os módulos de Clientes/Produtos/Backup existirem (Fases 3, 4 e 8 do [changelog](./06-changelog-tarefas.md)).

## 🖥️ Tela de bloqueio (`screens/License/LicenseBlockedScreen.tsx`)

Elementos obrigatórios da tela:
- Ícone/ilustração de estado bloqueado.
- Mensagem clara do motivo (`reason` retornado por `evaluateLicense()`):
  - `expired` / `offline` → *"Sua licença venceu e não conseguimos renovar automaticamente. Conecte-se à internet e tente novamente."*
  - `blocked` / `clock_tampered` → *"Detectamos uma alteração incomum na data do dispositivo. Ajuste o relógio para a data e hora corretas e tente novamente."*
  - `blocked` / `server_rejected` → *"Sua licença não pôde ser renovada. Entre em contato com o suporte para regularizar o acesso."*
  - `blocked` / `not_registered` → *"Não encontramos este dispositivo em nosso sistema de licenças. Entre em contato com o suporte informando o ID do dispositivo para liberar o acesso."*
- Botão **"Tentar novamente"** que:
  1. Reexecuta a checagem de conectividade.
  2. Se online e o Supabase estiver configurado, consulta `fetchLicenseFromSupabase` novamente.
  3. Mostra loading durante a tentativa; trata timeout com mensagem amigável.
- Exibe o **`device_id`** do dispositivo (texto selecionável) em todos os motivos de bloqueio — é o dado que o suporte precisa para cadastrar/liberar o dispositivo na tabela `licenses` do Supabase.
- Acesso alternativo (link/botão secundário) para **Exportar backup** — planejado para quando o módulo de Backup existir (ver nota de status logo acima), sempre visível exceto quando `blocked`/`server_rejected`.

## 🌐 Integração com o Supabase

A validação remota da licença usa a [Supabase REST API](https://supabase.com/docs/guides/api) (PostgREST) diretamente — sem SDK do Supabase instalado, só `fetch`.

**Configuração** (`src/services/api.ts`, lida de `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — ver `.env.example`):

| Variável | Valor | Observação |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://bzovfgugonrfiedqwtct.supabase.co/rest/v1` | Base REST do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Chave **anon/publishable** — segura para o bundle do app (protegida por RLS no Supabase). **Nunca** usar a `service_role` key aqui. |

> Variáveis com prefixo `EXPO_PUBLIC_` são inlineadas pelo Metro no bundle do app (suporte nativo do Expo desde o SDK 49) — não precisa de `react-native-dotenv` nem lib equivalente. `.env` está no `.gitignore`; use `.env.example` como referência para preencher o `.env` local.

**Tabela `licenses` no Supabase** (gerenciada fora deste repo): `device_id`, `client_name`, `license_expires_at`, `license_status`.

**Request** (`fetchLicenseFromSupabase`, em `services/licenseService.ts`)
```http
GET {SUPABASE_REST_URL}/licenses?device_id=eq.{deviceId}&select=device_id,license_expires_at,license_status
apikey: {EXPO_PUBLIC_SUPABASE_ANON_KEY}
Authorization: Bearer {EXPO_PUBLIC_SUPABASE_ANON_KEY}
Content-Type: application/json
```

**Response 200 — dispositivo licenciado e ativo**
```json
[
  {
    "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "license_expires_at": "2026-09-21T00:00:00.000Z",
    "license_status": "active"
  }
]
```
→ `licenseService` atualiza `license_control` local com esse `license_expires_at` e libera o uso.

**Response 200 — array vazio (device_id não cadastrado)**
```json
[]
```
→ `blocked` / `not_registered`.

**Response 200 — linha encontrada mas não ativa**
```json
[{ "device_id": "...", "license_expires_at": "...", "license_status": "blocked" }]
```
→ `blocked` / `server_rejected` (mesmo tratamento para `license_status: "expired"` vindo do Supabase).

**Response 401/403 — `apikey`/RLS rejeitando a consulta**
→ `blocked` / `server_rejected`.

### `license_expires_at` é a fonte da verdade, não `license_status`

O Postgres não atualiza colunas sozinho quando uma data passa — só reage a jobs agendados ou a valores computados na leitura. Por isso `fetchLicenseFromSupabase` **não confia cegamente** em `license_status`: mesmo que a coluna ainda diga `active` (porque o job de expiração no Supabase ainda não rodou), se `license_expires_at <= agora` a licença é tratada como rejeitada (`server_rejected`) no app. Isso torna o cliente resiliente independentemente de haver ou não um job configurado no banco.

Ainda assim, para manter a coluna `license_status` em si correta no painel/Table Editor do Supabase (útil para quem administra as licenças visualmente), configure um job `pg_cron` que sincroniza o status a partir da data periodicamente — **nos dois sentidos** (`active → expired` quando vence, e `expired → active` quando a data é renovada), mas **nunca mexe em `blocked`** (esse é só manual — ver [decisão de design](#-por-que-license_status-além-de-license_expires_at) abaixo):

```sql
-- 1. Ativar a extensão pg_cron: painel do Supabase → Database → Extensions → pg_cron → Enable
--    (precisa ser feito pela UI; SQL puro não habilita a extensão no Supabase gerenciado)

-- 2. Função que sincroniza license_status a partir de license_expires_at
create or replace function public.sync_license_statuses()
returns void
language sql
as $$
  update public.licenses
  set license_status = case
    when license_expires_at < now() then 'expired'
    else 'active'
  end
  where license_status <> 'blocked'  -- nunca mexe num bloqueio manual
    and license_status is distinct from (case when license_expires_at < now() then 'expired' else 'active' end);
$$;

-- 3. Agenda a função para rodar a cada 5 minutos
select cron.schedule(
  'sync-license-statuses-every-5-min',
  '*/5 * * * *',
  $$ select public.sync_license_statuses(); $$
);
```

> Se você já tinha criado a função `expire_licenses()`/job `expire-licenses-every-5-min` de uma versão anterior deste doc, rode `select cron.unschedule('expire-licenses-every-5-min');` antes de criar o novo job acima, pra não ficar com os dois agendados.

Para conferir/gerenciar o job depois: `select * from cron.job;` (lista) e `select cron.unschedule('sync-license-statuses-every-5-min');` (remove).

### 🤔 Por que `license_status` além de `license_expires_at`?

Não é redundante — são dois mecanismos independentes, e o app exige que **ambos** aprovem (`license_status === 'active'` **e** `license_expires_at` no futuro):
- **`license_expires_at`**: expiração natural "por tempo", sem ação manual.
- **`license_status`**: revogação manual e imediata, independente da data — o kill switch (`'blocked'`) para cortar acesso antes do vencimento (inadimplência, uso indevido, etc.) sem precisar editar a data. Por isso o job de sincronização acima nunca sobrescreve `'blocked'`.

## 🧩 Integração com `useLicenseGuard`

```ts
// hooks/useLicenseGuard.ts (assinatura real)
function useLicenseGuard(): {
  checking: boolean;
  status: 'active' | 'expired' | 'blocked' | null;
  reason?: 'clock_tampered' | 'offline' | 'server_rejected' | 'not_registered';
  deviceId?: string;
  retry: () => Promise<void>;
} {
  // 1. Lê/cria license_control local (evaluateLicense em services/licenseService.ts)
  // 2. Aplica a árvore de decisão descrita acima (com fetchLicenseFromSupabase quando aplicável)
  // 3. Expõe status para o RootNavigator decidir entre
  //    Stack de negócio (Clients/Products/Orders) ou LicenseBlockedScreen
}
```

O `RootNavigator` (em `src/navigation/`) deve consumir `useLicenseGuard` **antes** de montar qualquer stack de telas de negócio, garantindo que nenhuma tela sensível seja acessível com licença inválida.

## ✅ Checklist ao alterar esta regra

Sempre que o fluxo de licenciamento mudar (novo endpoint, novo estado, nova exceção de bloqueio), atualizar:
1. Este documento (`docs/04-sistema-licenca.md`).
2. O diagrama de estados acima, se novos estados/transições forem introduzidos.
3. `docs/06-changelog-tarefas.md` com data e resumo da mudança.

## 📎 Documentos relacionados

- Banco de dados: [docs/03-banco-de-dados.md](./03-banco-de-dados.md)
- Telas e módulos: [docs/05-modulos-telas.md](./05-modulos-telas.md)
