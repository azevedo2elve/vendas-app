import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      >
        <Text style={styles.buttonText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity style={styles.button} onPress={() => onChange(value + 1)} accessibilityLabel="Aumentar quantidade">
        <Text style={styles.buttonText}>+</Text>
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
});
