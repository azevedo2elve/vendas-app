# 04 — Sistema de Licença Offline

## 📌 Objetivo

Permitir que o app funcione **100% offline no dia a dia**, mas garantir que, periodicamente, o dispositivo precise "reportar-se" (com internet) para renovar sua licença de uso — impedindo uso indefinido sem controle, sem exigir conexão constante.

## 🗄️ Estado local (tabela `license_control`)

Ver schema completo em [docs/03-banco-de-dados.md](./03-banco-de-dados.md#-tabela-license_control). Campos:

| Campo | Descrição |
|---|---|
| `device_id` | UUID gerado na primeira execução do app (via `expo-crypto` ou `expo-application`), persistido localmente. Identifica o dispositivo perante a API de licença. |
| `license_expires_at` | Timestamp ISO de quando a licença atual expira. |
| `license_status` | `'active'` \| `'expired'` \| `'blocked'`. |
| `last_opened_at` | Timestamp ISO da última vez que o app foi aberto com sucesso. Base do anti-fraude de relógio. |

## 🧠 Regra de decisão (executada a cada abertura do app)

A lógica vive em `services/licenseService.ts` e é consumida pelo hook `hooks/useLicenseGuard.ts`, que roda antes de liberar a navegação para qualquer tela de negócio.

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
       → Verifica conectividade (NetInfo)

       SE HÁ INTERNET:
           → Faz fetch na API de licença (POST /license/renew, payload: device_id)
           → SE resposta OK:
                → Atualiza license_expires_at (novo valor retornado pela API)
                → license_status = 'active'
                → Atualiza last_opened_at = agora
                → Libera navegação
           → SE resposta de erro (licença cancelada/bloqueada no backend):
                → license_status = 'blocked'
                → Exibe tela de bloqueio (sem retry automático, mensagem específica)

       SE NÃO HÁ INTERNET (ou falha de rede/timeout):
           → license_status = 'expired'
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

## 🖥️ Tela de bloqueio (`screens/License/LicenseBlockedScreen.tsx`)

Elementos obrigatórios da tela:
- Ícone/ilustração de estado bloqueado.
- Mensagem clara do motivo:
  - `expired` sem internet → *"Sua licença venceu e não conseguimos renovar automaticamente. Conecte-se à internet e tente novamente."*
  - `blocked` por relógio → *"Detectamos uma alteração incomum na data do dispositivo. Ajuste o relógio para a data correta e reabra o app."*
  - `blocked` por recusa do backend → *"Sua licença não pôde ser renovada. Entre em contato com o suporte."*
- Botão **"Tentar novamente"** que:
  1. Reexecuta a checagem de conectividade.
  2. Se online, tenta o fetch de renovação novamente.
  3. Mostra loading durante a tentativa; trata timeout com mensagem amigável.
- Acesso alternativo (link/botão secundário) para **Exportar backup**, sempre visível exceto quando `license_status === 'blocked'` por recusa do backend.

## 🌐 Contrato da API de licença (referência)

> Endpoint ilustrativo — ajustar para a URL real do backend de licenciamento quando definida.

**Request**
```http
POST /api/license/renew
Content-Type: application/json

{
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response 200 (renovação concedida)**
```json
{
  "license_status": "active",
  "license_expires_at": "2026-09-21T00:00:00.000Z"
}
```

**Response 403 (licença cancelada/bloqueada)**
```json
{
  "license_status": "blocked",
  "reason": "subscription_cancelled"
}
```

## 🧩 Integração com `useLicenseGuard`

```ts
// hooks/useLicenseGuard.ts (assinatura de referência)
function useLicenseGuard(): {
  status: 'checking' | 'active' | 'expired' | 'blocked';
  retry: () => Promise<void>;
} {
  // 1. Lê license_control local
  // 2. Aplica a árvore de decisão descrita acima
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
