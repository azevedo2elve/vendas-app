import { useCallback, useEffect, useState } from 'react';
import { evaluateLicense, type LicenseCheckResult } from '@/services/licenseService';

export type LicenseGuardState =
  | { checking: true; result: null }
  | { checking: false; result: LicenseCheckResult };

// Reavalia a licença periodicamente enquanto o app fica aberto (não só na abertura) — é o que
// permite pegar o dia do vencimento (renovação proativa), a virada de dia após o vencimento
// (escala para `blocked` depois de 1 dia de tolerância) e manter os lembretes de vencimento
// próximo atualizados sem precisar fechar/abrir o app. 15 minutos é um equilíbrio razoável entre
// "reage rápido o suficiente" e "não fica batendo no Supabase toda hora".
const RECHECK_INTERVAL_MS = 15 * 60 * 1000;

export function useLicenseGuard() {
  const [state, setState] = useState<LicenseGuardState>({ checking: true, result: null });

  const check = useCallback(async () => {
    setState({ checking: true, result: null });
    const result = await evaluateLicense();
    setState({ checking: false, result });
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Reavaliação silenciosa: não passa por `checking: true` (evita piscar uma tela de
      // loading no meio do uso normal do app) — só atualiza o resultado quando terminar.
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
