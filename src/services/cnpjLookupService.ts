import NetInfo from '@react-native-community/netinfo';
import { onlyDigits } from '@/utils/masks';

// Busca de dados da empresa por CNPJ (BrasilAPI, dados oficiais da Receita Federal) — melhoria
// oportunista, nunca bloqueia o cadastro manual. Só se aplica a CNPJ: não existe consulta
// pública equivalente para CPF (pessoa física). Ver Fase 14 em docs/06-changelog-tarefas.md.
const BRASILAPI_CNPJ_URL = 'https://brasilapi.com.br/api/cnpj/v1';

export type CnpjLookupResult = {
  name: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
};

type BrasilApiCnpjResponse = {
  razao_social?: string;
  nome_fantasia?: string;
  ddd_telefone_1?: string;
  descricao_tipo_de_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
};

async function isOnline(): Promise<boolean> {
  const netState = await NetInfo.fetch();
  return Boolean(netState.isConnected && netState.isInternetReachable !== false);
}

// Retorna null sempre que a busca não puder ser concluída (offline, CNPJ inexistente, erro de
// rede) — o formulário segue editável manualmente nesses casos, sem exibir erro bloqueante.
export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | null> {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return null;
  if (!(await isOnline())) return null;

  try {
    const response = await fetch(`${BRASILAPI_CNPJ_URL}/${digits}`);
    if (!response.ok) return null;

    const data: BrasilApiCnpjResponse = await response.json();
    const street = [data.descricao_tipo_de_logradouro?.trim(), data.logradouro?.trim()].filter(Boolean).join(' ');

    return {
      name: data.razao_social ?? '',
      phone: onlyDigits(data.ddd_telefone_1 ?? ''),
      addressStreet: street,
      addressNumber: data.numero ?? '',
      addressComplement: data.complemento ?? '',
      addressCity: data.municipio ?? '',
      addressState: data.uf ?? '',
      addressZip: onlyDigits(data.cep ?? ''),
    };
  } catch {
    return null;
  }
}
