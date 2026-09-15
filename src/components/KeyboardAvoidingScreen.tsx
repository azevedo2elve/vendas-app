import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type KeyboardAvoidingScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Evita o teclado cobrir o campo em edição em telas de formulário (ScrollView + TextInput/
// MaskedInput) — sem isso, campos perto do fim da tela (ex: "Observações") ficam escondidos
// atrás do teclado ao focar. No Android o SO já redimensiona a janela ("adjustResize", padrão do
// template Expo — ver AndroidManifest gerado), mas isso sozinho não garante que o ScrollView role
// até o campo focado; no iOS não existe nenhum resize automático de janela, então é ainda mais
// necessário lá. Usar como wrapper direto do ScrollView de cada tela de formulário.
export function KeyboardAvoidingScreen({ children, style }: KeyboardAvoidingScreenProps) {
  return (
    <KeyboardAvoidingView style={[styles.flex, style]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
