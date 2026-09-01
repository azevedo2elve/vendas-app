import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type LicenseExpiryBannerProps = {
  expiresAt: Date;
  onValidateNow: () => void;
  validating: boolean;
};

type Threshold = { ms: number; label: string };

const THRESHOLDS: Threshold[] = [
  { ms: 5 * 24 * 60 * 60 * 1000, label: '5 dias' },
  { ms: 2 * 24 * 60 * 60 * 1000, label: '2 dias' },
  { ms: 1 * 24 * 60 * 60 * 1000, label: '1 dia' },
  { ms: 2 * 60 * 60 * 1000, label: '2 horas' },
  { ms: 1 * 60 * 60 * 1000, label: '1 hora' },
];

// O aviso mais "apertado" (menor threshold) já cruzado pelo tempo restante — ex: faltando 20h,
// já cruzamos "5 dias", "2 dias" e "1 dia", mas o mais relevante pra mostrar é "1 dia".
function currentThreshold(remainingMs: number): Threshold | null {
  if (remainingMs <= 0) return null;
  const crossed = THRESHOLDS.filter((t) => remainingMs <= t.ms);
  if (crossed.length === 0) return null;
  return crossed.reduce((tightest, t) => (t.ms < tightest.ms ? t : tightest));
}

// Faixa não-bloqueante (o app continua 100% usável por baixo) mostrada quando a licença ainda
// está `active` mas perto de vencer — 5, 2 e 1 dia, e 2 e 1 hora antes. Some sozinha quando a
// licença é renovada (deixa de estar dentro de qualquer threshold) e pode ser fechada pelo
// usuário (reaparece automaticamente se um threshold mais apertado for cruzado depois).
export function LicenseExpiryBanner({ expiresAt, onValidateNow, validating }: LicenseExpiryBannerProps) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const [dismissedThresholdMs, setDismissedThresholdMs] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const threshold = currentThreshold(expiresAt.getTime() - now);
  if (!threshold || threshold.ms === dismissedThresholdMs) {
    return null;
  }

  const dateLabel = expiresAt.toLocaleDateString('pt-BR');
  const timeLabel = expiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Ionicons name="alarm-outline" size={16} color={colors.warningStrong} />
      <Text style={styles.text} numberOfLines={3}>
        Sua licença vence em {threshold.label} ({dateLabel} às {timeLabel}) — fique conectado à internet para
        renovar automaticamente.
      </Text>
      <TouchableOpacity onPress={onValidateNow} disabled={validating} style={styles.validateButton}>
        {validating ? (
          <ActivityIndicator size="small" color={colors.warningStrong} />
        ) : (
          <Text style={styles.validateText}>Validar agora</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setDismissedThresholdMs(threshold.ms)}
        accessibilityLabel="Fechar aviso"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.warningStrong} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  text: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.warningStrong,
  },
  validateButton: {
    paddingHorizontal: spacing.xs,
  },
  validateText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.warningStrong,
    textDecorationLine: 'underline',
  },
});
