import NetInfo from '@react-native-community/netinfo';
import { onlyDigits } from '@/utils/masks';

// Busca de endereço por CEP (ViaCEP) — melhoria oportunista, nunca bloqueia o cadastro manual.
// Ver Fase 14 em docs/06-changelog-tarefas.md.
const VIACEP_BASE_URL = 'https://viacep.com.br/ws';

export type CepLookupResult = {
  street: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  localidade?: string;
  uf?: string;
};

async function isOnline(): Promise<boolean> {
  const netState = await NetInfo.fetch();
  return Boolean(netState.isConnected && netState.isInternetReachable !== false);
}

// Retorna null sempre que a busca não puder ser concluída (offline, CEP inexistente, erro de
// rede) — o formulário segue editável manualmente nesses casos, sem exibir erro bloqueante.
export async function lookupCep(cep: string): Promise<CepLookupResult | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  if (!(await isOnline())) return null;

  try {
    const response = await fetch(`${VIACEP_BASE_URL}/${digits}/json/`);
    if (!response.ok) return null;

    const data: ViaCepResponse = await response.json();
    if (data.erro) return null;

    return {
      street: data.logradouro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
