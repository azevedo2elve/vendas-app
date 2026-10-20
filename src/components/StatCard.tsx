import type { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone?: 'accent' | 'success' | 'neutral';
  subtitle?: string;
  onPress?: () => void;
};

const TONE_STYLES: Record<NonNullable<StatCardProps['tone']>, { bg: string; fg: string }> = {
  accent: { bg: colors.accentLight, fg: colors.accent },
  success: { bg: colors.successBgSoft, fg: colors.success },
  neutral: { bg: colors.slate100, fg: colors.slate600 },
};

export function StatCard({ label, value, icon, tone = 'neutral', subtitle, onPress }: StatCardProps) {
  const toneStyle = TONE_STYLES[tone];
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component style={styles.card} {...(onPress ? { onPress, activeOpacity: 0.72, accessibilityRole: 'button' } : {})}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: toneStyle.bg }]}>
          <Ionicons name={icon} size={20} color={toneStyle.fg} />
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} /> : null}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.labelGroup}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Component>
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
    minHeight: 114,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  labelGroup: {
    gap: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
