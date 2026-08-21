import { useCallback, useEffect, useState } from 'react';
import { evaluateLicense, type LicenseCheckResult } from '@/services/licenseService';

export type LicenseGuardState =
  | { checking: true; result: null }
  | { checking: false; result: LicenseCheckResult };

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

  return {
    checking: state.checking,
    status: state.result?.status ?? null,
    reason: state.result?.reason,
    deviceId: state.result?.deviceId,
    retry: check,
  };
}
