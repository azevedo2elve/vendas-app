import { createContext, useContext, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { evaluateLicense, type LicenseCheckResult } from '@/services/licenseService';

type LicenseAccessContextValue = {
  // true quando a licença está `expired` (sem internet) — o app fica navegável, mas só leitura.
  // Nunca true quando `blocked`: nesse estado o RootNavigator nem monta este provider, porque
  // a tela de bloqueio substitui o app inteiro (única exceção é o botão de backup embutido nela).
  readOnly: boolean;
  // Data de vencimento da licença — usada pela HomeScreen para montar o status
  // "Licença Válida"/"Faltam N dias". `null` só durante o carregamento inicial.
  expiresAt: Date | null;
  // A MESMA instância de `useLicenseGuard().retry` usada pelo `RootNavigator` — nunca chamar
  // `evaluateLicense()` direto fora daqui (ex: num botão de tela) para reavaliar a licença: isso
  // persiste o novo status no banco, mas não atualiza o estado que o RootNavigator usa pra
  // decidir se mostra `LicenseBlockedScreen`, que só re-executa sozinho a cada 5 min — na prática,
  // o app continuava navegável por até 5 minutos depois de um "Verificar Licença Agora" que já
  // tinha detectado bloqueio. Chamar este `retry` compartilhado atualiza os dois ao mesmo tempo.
  retry: () => Promise<LicenseCheckResult>;
};

const LicenseAccessContext = createContext<LicenseAccessContextValue>({
  readOnly: false,
  expiresAt: null,
  retry: evaluateLicense,
});

export function LicenseAccessProvider({
  readOnly,
  expiresAt,
  retry,
  children,
}: {
  readOnly: boolean;
  expiresAt: Date | null;
  retry: () => Promise<LicenseCheckResult>;
  children: ReactNode;
}) {
  return (
    <LicenseAccessContext.Provider value={{ readOnly, expiresAt, retry }}>{children}</LicenseAccessContext.Provider>
  );
}

export function useLicenseAccess(): LicenseAccessContextValue {
  return useContext(LicenseAccessContext);
}

const READ_ONLY_MESSAGE =
  'Esta ação não está disponível com a licença expirada. Conecte-se à internet para renovar, ou exporte seus dados em Backup.';

// Envolve uma ação que cria/edita/exclui dados: se a licença estiver em modo somente-leitura,
// mostra um aviso e não executa nada; senão, executa normalmente. Usado nos botões de criar,
// salvar, excluir, emitir pedido, etc. — a visualização de dados nunca passa por aqui.
export function useReadOnlyGuard() {
  const { readOnly } = useLicenseAccess();

  function guard(action: () => void) {
    if (readOnly) {
      Alert.alert('Licença expirada', READ_ONLY_MESSAGE);
      return;
    }
    action();
  }

  return { readOnly, guard };
}
