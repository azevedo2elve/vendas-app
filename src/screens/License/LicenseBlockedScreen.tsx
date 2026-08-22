import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LicenseCheckResult } from '@/services/licenseService';

type LicenseBlockedScreenProps = {
  status: Exclude<LicenseCheckResult['status'], 'active'>;
  reason: LicenseCheckResult['reason'];
  deviceId?: string;
  onRetry: () => Promise<void>;
};

const MESSAGES: Record<string, string> = {
  offline:
    'Sua licença venceu e não conseguimos renovar automaticamente. Conecte-se à internet e tente novamente.',
  clock_tampered:
    'Detectamos uma alteração incomum na data do dispositivo. Ajuste o relógio para a data e hora corretas e tente novamente.',
  server_rejected:
    'Sua licença não pôde ser renovada. Entre em contato com o suporte para regularizar o acesso.',
  not_registered:
    'Não encontramos este dispositivo em nosso sistema de licenças. Entre em contato com o suporte informando o ID do dispositivo para liberar o acesso.',
};

export function LicenseBlockedScreen({ status, reason, deviceId, onRetry }: LicenseBlockedScreenProps) {
  const [retrying, setRetrying] = useState(false);

  const message = MESSAGES[reason ?? 'offline'] ?? MESSAGES.offline;

  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{status === 'blocked' ? 'Acesso bloqueado' : 'Licença expirada'}</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity style={styles.button} onPress={handleRetry} disabled={retrying}>
        {retrying ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Tentar novamente</Text>
        )}
      </TouchableOpacity>

      {deviceId ? (
        <Text style={styles.deviceId} selectable>
          ID do dispositivo: {deviceId}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  deviceId: {
    marginTop: 24,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
