import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
};

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successBg, fg: colors.successStrong },
  warning: { bg: colors.warningBg, fg: colors.warningStrong },
  danger: { bg: colors.dangerBg, fg: colors.dangerStrong },
  neutral: { bg: colors.slate100, fg: colors.slate600 },
  info: { bg: colors.infoBg, fg: colors.info },
  accent: { bg: colors.accentSoft, fg: colors.accentDark },
};

export function Badge({ label, tone = 'neutral', dot = false }: BadgeProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: toneStyle.fg }]} /> : null}
      <Text style={[styles.label, { color: toneStyle.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
