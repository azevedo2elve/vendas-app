import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LicenseCheckResult } from '@/services/licenseService';
import { colors, radii, spacing } from '@/theme';

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
      <View style={styles.iconCircle}>
        <Ionicons name={status === 'blocked' ? 'lock-closed' : 'time-outline'} size={40} color={colors.danger} />
      </View>

      <Text style={styles.title}>{status === 'blocked' ? 'Acesso bloqueado' : 'Licença expirada'}</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity style={styles.button} onPress={handleRetry} disabled={retrying} activeOpacity={0.8}>
        {retrying ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </View>
        )}
      </TouchableOpacity>

      {deviceId ? (
        <View style={styles.deviceIdBox}>
          <Text style={styles.deviceIdLabel}>ID do dispositivo</Text>
          <Text style={styles.deviceId} selectable>
            {deviceId}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 380,
  },
  button: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  deviceIdBox: {
    marginTop: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deviceIdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
