import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected = false, onPress, icon, style }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.chipSelected : null, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.white : colors.slate600} style={styles.icon} />
      ) : null}
      <Text style={[styles.label, selected ? styles.labelSelected : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
  },
  labelSelected: {
    color: colors.white,
  },
});
