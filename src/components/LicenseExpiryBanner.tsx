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

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const MAX_DAYS_BEFORE = 5;

// A partir de 5 dias antes do vencimento, o aviso conta os dias regressivamente um a um (5, 4,
// 3, 2, 1 — não pula direto de "5 dias" pra "2 dias"); nas últimas 2h, troca pra contagem em
// hora ("2 horas", depois "1 hora"), mais precisa que "1 dia" pros minutos finais.
function currentReminderLabel(remainingMs: number): string | null {
  if (remainingMs <= 0) return null;
  if (remainingMs <= ONE_HOUR_MS) return '1 hora';
  if (remainingMs <= 2 * ONE_HOUR_MS) return '2 horas';

  const daysRemaining = Math.ceil(remainingMs / ONE_DAY_MS);
  if (daysRemaining > MAX_DAYS_BEFORE) return null;
  return daysRemaining === 1 ? '1 dia' : `${daysRemaining} dias`;
}

// Faixa não-bloqueante (o app continua 100% usável por baixo) mostrada quando a licença ainda
// está `active` mas perto de vencer — 5, 2 e 1 dia, e 2 e 1 hora antes. Some sozinha quando a
// licença é renovada (deixa de estar dentro de qualquer threshold) e pode ser fechada pelo
// usuário (reaparece automaticamente se um threshold mais apertado for cruzado depois).
export function LicenseExpiryBanner({ expiresAt, onValidateNow, validating }: LicenseExpiryBannerProps) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  // Chave de "fechado" é o próprio rótulo (não um valor fixo): como a contagem muda todo dia
  // (5 dias → 4 dias → 3 dias...), fechar o aviso em "3 dias" não esconde o de "2 dias" no dia
  // seguinte — reaparece sozinho a cada rótulo novo.
  const [dismissedLabel, setDismissedLabel] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const label = currentReminderLabel(expiresAt.getTime() - now);
  if (!label || label === dismissedLabel) {
    return null;
  }

  const dateLabel = expiresAt.toLocaleDateString('pt-BR');
  const timeLabel = expiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Ionicons name="alarm-outline" size={16} color={colors.warningStrong} />
      <Text style={styles.text} numberOfLines={3}>
        Sua licença vence em {label} ({dateLabel} às {timeLabel}) — fique conectado à internet para renovar
        automaticamente.
      </Text>
      <TouchableOpacity onPress={onValidateNow} disabled={validating} style={styles.validateButton}>
        {validating ? (
          <ActivityIndicator size="small" color={colors.warningStrong} />
        ) : (
          <Text style={styles.validateText}>Validar agora</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setDismissedLabel(label)}
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
