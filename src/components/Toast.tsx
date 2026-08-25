import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '@/theme';

type ToastTone = 'success' | 'error' | 'info';

type ToastState = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CONFIG: Record<ToastTone, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: colors.navy900, icon: 'checkmark-circle' },
  error: { bg: colors.dangerStrong, icon: 'alert-circle' },
  info: { bg: colors.navy800, icon: 'information-circle' },
};

const TONE_ICON_COLOR: Record<ToastTone, string> = {
  success: colors.successLight,
  error: colors.white,
  info: colors.accentSoft,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 16, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ id: Date.now(), message, tone });
      opacity.setValue(0);
      translateY.setValue(16);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      timeoutRef.current = setTimeout(dismiss, 2800);
    },
    [opacity, translateY, dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const toneConfig = toast ? TONE_CONFIG[toast.tone] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && toneConfig ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: insets.bottom + spacing.lg,
              backgroundColor: toneConfig.bg,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Ionicons name={toneConfig.icon} size={18} color={TONE_ICON_COLOR[toast.tone]} />
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignSelf: 'center',
    maxWidth: 480,
    ...shadows.floating,
  },
  message: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
