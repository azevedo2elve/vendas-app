import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, spacing } from '@/theme';
import { formatCurrencyBRL, maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '@/utils/masks';

export type MaskType = 'cpfCnpj' | 'phone' | 'currency' | 'cep';

type MaskedInputProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label?: string;
  error?: string;
  mask?: MaskType;
  /** Dígitos puros (cpfCnpj/phone) ou centavos como string (currency); texto puro nos demais casos. */
  value: string;
  onChangeText: (value: string) => void;
};

export const MaskedInput = forwardRef<TextInput, MaskedInputProps>(function MaskedInput(
  { label, error, mask, value, onChangeText, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);

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
    if (mask === 'cep') {
      onChangeText(onlyDigits(text).slice(0, 8));
      return;
    }
    onChangeText(text);
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
        value={formatForDisplay(mask, value)}
        onChangeText={handleChangeText}
        keyboardType={mask ? 'numeric' : rest.keyboardType}
        placeholderTextColor={colors.slate400}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
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
    case 'cep':
      return maskCep(value);
    default:
      return value;
  }
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
  },
});
