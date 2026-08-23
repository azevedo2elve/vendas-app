import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { formatCurrencyBRL, maskCpfCnpj, maskPhone, onlyDigits } from '@/utils/masks';

export type MaskType = 'cpfCnpj' | 'phone' | 'currency';

type MaskedInputProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label?: string;
  error?: string;
  mask?: MaskType;
  /** Dígitos puros (cpfCnpj/phone) ou centavos como string (currency); texto puro nos demais casos. */
  value: string;
  onChangeText: (value: string) => void;
};

export const MaskedInput = forwardRef<TextInput, MaskedInputProps>(function MaskedInput(
  { label, error, mask, value, onChangeText, style, ...rest },
  ref
) {
  function handleChangeText(text: string) {
    if (mask === 'currency') {
      const digits = onlyDigits(text);
      onChangeText(digits === '' ? '0' : String(Number(digits)));
      return;
    }
    if (mask === 'cpfCnpj') {
      onChangeText(onlyDigits(text).slice(0, 14));
      return;
    }
    if (mask === 'phone') {
      onChangeText(onlyDigits(text).slice(0, 11));
      return;
    }
    onChangeText(text);
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputError : null, style]}
        value={formatForDisplay(mask, value)}
        onChangeText={handleChangeText}
        keyboardType={mask ? 'numeric' : rest.keyboardType}
        placeholderTextColor="#94A3B8"
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

function formatForDisplay(mask: MaskType | undefined, value: string): string {
  switch (mask) {
    case 'cpfCnpj':
      return maskCpfCnpj(value);
    case 'phone':
      return maskPhone(value);
    case 'currency':
      return formatCurrencyBRL(Number(value || '0'));
    default:
      return value;
  }
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
  },
});
