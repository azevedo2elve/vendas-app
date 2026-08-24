import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaskedInput } from './MaskedInput';

type DiscountMode = 'amount' | 'percent';

type DiscountInputProps = {
  label?: string;
  /** Valor (em centavos) sobre o qual o modo percentual é calculado. */
  baseAmount: number;
  /** Desconto atual, sempre em centavos — o modo (R$/%) é só uma conveniência de digitação. */
  valueCents: number;
  onChange: (cents: number) => void;
};

function formatPercentFromCents(cents: number, base: number): string {
  if (base <= 0) return '0';
  const percent = (cents / base) * 100;
  return percent === 0 ? '0' : String(Math.round(percent * 100) / 100);
}

export function DiscountInput({ label = 'Desconto', baseAmount, valueCents, onChange }: DiscountInputProps) {
  const [mode, setMode] = useState<DiscountMode>('amount');
  const [percentText, setPercentText] = useState(() => formatPercentFromCents(valueCents, baseAmount));

  function handleAmountChange(cents: string) {
    onChange(Number(cents));
  }

  function handlePercentChange(text: string) {
    const sanitized = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setPercentText(sanitized);
    const percent = Number(sanitized);
    const cents = Number.isFinite(percent) ? Math.round((baseAmount * percent) / 100) : 0;
    onChange(cents);
  }

  function switchMode(next: DiscountMode) {
    if (next === 'percent') {
      setPercentText(formatPercentFromCents(valueCents, baseAmount));
    }
    setMode(next);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'amount' ? styles.toggleButtonActive : null]}
            onPress={() => switchMode('amount')}
          >
            <Text style={[styles.toggleText, mode === 'amount' ? styles.toggleTextActive : null]}>R$</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'percent' ? styles.toggleButtonActive : null]}
            onPress={() => switchMode('percent')}
          >
            <Text style={[styles.toggleText, mode === 'percent' ? styles.toggleTextActive : null]}>%</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'amount' ? (
        <MaskedInput mask="currency" value={String(valueCents)} onChangeText={handleAmountChange} />
      ) : (
        <TextInput
          style={styles.percentInput}
          keyboardType="decimal-pad"
          value={percentText}
          onChangeText={handlePercentChange}
          placeholder="0"
          placeholderTextColor="#94A3B8"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonActive: {
    backgroundColor: '#2563EB',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  percentInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
});
