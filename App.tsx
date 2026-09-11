import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ToastProvider } from '@/components/Toast';
import { useRemoteBackupSync } from '@/hooks/useRemoteBackupSync';

export default function App() {
  // Independente da tela/licença atual (até em modo somente-leitura ou bloqueado) — é um backup
  // de segurança, então roda sempre que o app está aberto, não só quando a licença está `active`.
  useRemoteBackupSync();

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
