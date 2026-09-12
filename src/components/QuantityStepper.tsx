import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '@/theme';
import { onlyDigits } from '@/utils/masks';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
};

// O número no meio é um TextInput (teclado numérico), não só texto — pedido do cliente pra
// digitar direto a quantidade (ex: 50) em vez de tocar "+" repetidas vezes em vendas grandes.
export function QuantityStepper({ value, onChange, min = 1 }: QuantityStepperProps) {
  const [text, setText] = useState(String(value));
  // Ressincroniza o texto exibido quando `value` muda por fora (botões +/-, ou outro código
  // ajustando o carrinho) — durante a própria digitação no campo, é sempre este componente quem
  // muda `value` (via onChange), então não conflita com o que o usuário está digitando.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  function handleChangeText(raw: string) {
    const digits = onlyDigits(raw).slice(0, 5);
    setText(digits);
    // Campo vazio momentâneo (usuário apagou tudo pra digitar de novo) não força min ainda —
    // só ao sair do campo (handleBlur), senão não daria pra apagar "1" pra digitar "50".
    if (digits === '') return;
    onChange(Math.max(min, Number(digits)));
  }

  function handleBlur() {
    if (text === '' || Number(text) < min) {
      setText(String(min));
      onChange(min);
    }
  }

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
      <TextInput
        style={styles.value}
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel="Quantidade"
      />
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
    minWidth: 32,
    textAlign: 'center',
    padding: 0,
  },
});
