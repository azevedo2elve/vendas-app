export const colors = {
  // Navy / slate scale (primary + text)
  navy900: '#0F172A',
  navy800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',

  // Accent — royal blue
  accent: '#2563EB',
  accentDark: '#1D4ED8',
  accentLight: '#EFF6FF',
  accentSoft: '#DBEAFE',

  // Success / money — emerald
  success: '#059669',
  successStrong: '#047857',
  successLight: '#10B981',
  successBg: '#D1FAE5',
  successBgSoft: '#ECFDF5',

  // Warning — amber
  warning: '#D97706',
  warningStrong: '#B45309',
  warningBg: '#FEF3C7',
  warningBgSoft: '#FFFBEB',

  // Danger — red
  danger: '#DC2626',
  dangerStrong: '#B91C1C',
  dangerBg: '#FEE2E2',
  dangerBgSoft: '#FEF2F2',

  // Info — sky (used sparingly, e.g. "offline" indicator)
  info: '#0284C7',
  infoBg: '#E0F2FE',

  // Surfaces & backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  // WhatsApp brand (used only for the WhatsApp quick-action affordance)
  whatsapp: '#25D366',
  whatsappBg: '#E7F9EF',
} as const;

export type ColorToken = keyof typeof colors;
