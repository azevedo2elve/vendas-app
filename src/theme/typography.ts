import type { TextStyle } from 'react-native';
import { colors } from './colors';

type TypographyPreset = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'color' | 'letterSpacing'>;

export const typography = {
  display: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: colors.textPrimary } as TypographyPreset,
  h1: { fontSize: 22, fontWeight: '700', lineHeight: 28, color: colors.textPrimary } as TypographyPreset,
  h2: { fontSize: 18, fontWeight: '700', lineHeight: 24, color: colors.textPrimary } as TypographyPreset,
  h3: { fontSize: 16, fontWeight: '700', lineHeight: 22, color: colors.textPrimary } as TypographyPreset,
  subtitle: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: colors.textSecondary } as TypographyPreset,
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21, color: colors.textPrimary } as TypographyPreset,
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18, color: colors.textSecondary } as TypographyPreset,
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18, color: colors.slate700 } as TypographyPreset,
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16, color: colors.textMuted } as TypographyPreset,
  money: { fontSize: 18, fontWeight: '800', lineHeight: 22, color: colors.success } as TypographyPreset,
  moneyLarge: { fontSize: 26, fontWeight: '800', lineHeight: 32, color: colors.success } as TypographyPreset,
} as const;
