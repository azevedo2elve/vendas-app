import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '@/theme';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
};

export function QuantityStepper({ value, onChange, min = 1 }: QuantityStepperProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel="Diminuir quantidade"
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={18} color={colors.accent} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onChange(value + 1)}
        accessibilityLabel="Aumentar quantidade"
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
});
