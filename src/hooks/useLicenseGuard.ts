import { useCallback, useEffect, useState } from 'react';
import { evaluateLicense, type LicenseCheckResult } from '@/services/licenseService';

export type LicenseGuardState = { checking: true; result: null } | { checking: false; result: LicenseCheckResult };

// Reavalia a licença periodicamente enquanto o app fica aberto (não só na abertura) — é o que
// permite renovar proativamente (mesmo longe do vencimento), pegar a virada de dia após o
// vencimento (escala para `blocked` depois de 1 dia de tolerância) e manter os lembretes de
// vencimento próximo atualizados sem precisar fechar/abrir o app.
const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useLicenseGuard() {
  const [state, setState] = useState<LicenseGuardState>({ checking: true, result: null });

  // Reavaliação silenciosa: nunca passa por `checking: true` — só atualiza `result` quando
  // termina. `checking` só é `true` no estado inicial (antes do 1º resultado existir), nunca de
  // novo depois disso: o RootNavigator desmonta a árvore de navegação inteira (perdendo estado de
  // formulário/scroll de qualquer tela) sempre que `checking` é `true`, então um `retry` manual
  // (botão "Verificar Licença Agora" nas Configurações, banners, tela de bloqueio) preservar
  // `checking: false` é o que evita esse "piscar" da tela inteira — cada chamador já mostra seu
  // próprio indicador de carregamento local enquanto aguarda.
  const check = useCallback(async () => {
    const result = await evaluateLicense();
    setState({ checking: false, result });
    return result;
  }, []);

  useEffect(() => {
    evaluateLicense().then((result) => setState({ checking: false, result }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      evaluateLicense().then((result) => setState({ checking: false, result }));
    }, RECHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return {
    checking: state.checking,
    status: state.result?.status ?? null,
    reason: state.result?.reason,
    deviceId: state.result?.deviceId,
    expiresAt: state.result?.expiresAt ?? null,
    retry: check,
  };
}
