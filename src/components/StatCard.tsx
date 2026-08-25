import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone?: 'accent' | 'success' | 'neutral';
};

const TONE_STYLES: Record<NonNullable<StatCardProps['tone']>, { bg: string; fg: string }> = {
  accent: { bg: colors.accentLight, fg: colors.accent },
  success: { bg: colors.successBgSoft, fg: colors.success },
  neutral: { bg: colors.slate100, fg: colors.slate600 },
};

export function StatCard({ label, value, icon, tone = 'neutral' }: StatCardProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: toneStyle.bg }]}>
        <Ionicons name={icon} size={20} color={toneStyle.fg} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    ...shadows.card,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
