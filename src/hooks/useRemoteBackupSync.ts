import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncRemoteBackupIfNeeded } from '@/services/remoteBackupService';

// Tenta o backup remoto silencioso na abertura do app, a cada 15 min enquanto ele fica aberto, e
// assim que a internet voltar — sem esperar o vendedor reabrir o app. `syncRemoteBackupIfNeeded`
// já garante no máximo um envio por dia local e não faz nada sem internet, então chamar com essa
// frequência é barato: na prática só "faz algo" na primeira vez do dia em que há conexão.
const RECHECK_INTERVAL_MS = 15 * 60 * 1000;

export function useRemoteBackupSync() {
  useEffect(() => {
    syncRemoteBackupIfNeeded();

    const interval = setInterval(() => {
      syncRemoteBackupIfNeeded();
    }, RECHECK_INTERVAL_MS);

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncRemoteBackupIfNeeded();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);
}
