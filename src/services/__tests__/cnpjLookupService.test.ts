/// <reference types="jest" />
/// <reference types="node" />
import NetInfo from '@react-native-community/netinfo';
import { lookupCnpj } from '@/services/cnpjLookupService';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const netInfoFetch = NetInfo.fetch as jest.Mock;

describe('lookupCnpj', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    netInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  });

  it('retorna null sem tentar a busca quando o CNPJ não tem 14 dígitos', async () => {
    const result = await lookupCnpj('123');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('retorna null sem tentar a busca quando está offline', async () => {
    netInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const result = await lookupCnpj('11.222.333/0001-81');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('retorna os dados da empresa em caso de sucesso, montando a rua a partir do tipo de logradouro', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        razao_social: 'Empresa Teste LTDA',
        ddd_telefone_1: '(11) 5525-6439',
        descricao_tipo_de_logradouro: 'AVENIDA',
        logradouro: 'PAULISTA',
        numero: '1000',
        complemento: 'SALA 1',
        municipio: 'SAO PAULO',
        uf: 'SP',
        cep: '01310-100',
      }),
    });

    const result = await lookupCnpj('11.222.333/0001-81');

    expect(global.fetch).toHaveBeenCalledWith('https://brasilapi.com.br/api/cnpj/v1/11222333000181');
    expect(result).toEqual({
      name: 'Empresa Teste LTDA',
      phone: '1155256439',
      addressStreet: 'AVENIDA PAULISTA',
      addressNumber: '1000',
      addressComplement: 'SALA 1',
      addressCity: 'SAO PAULO',
      addressState: 'SP',
      addressZip: '01310100',
    });
  });

  it('retorna null quando o CNPJ não é encontrado (HTTP não-ok)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const result = await lookupCnpj('11.222.333/0001-81');
    expect(result).toBeNull();
  });

  it('retorna null em falha de rede, sem lançar erro', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
    const result = await lookupCnpj('11.222.333/0001-81');
    expect(result).toBeNull();
  });
});
