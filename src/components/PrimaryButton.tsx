import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'outline';
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  style,
}: PrimaryButtonProps) {
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[styles.button, styles[variant], disabled ? styles.disabled : null, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.accent : colors.white} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={isOutline ? colors.slate700 : colors.white}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.label, isOutline ? styles.labelOutline : null]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  success: {
    backgroundColor: colors.success,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  labelOutline: {
    color: colors.slate700,
  },
});
