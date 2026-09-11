/// <reference types="jest" />
/// <reference types="node" />
import NetInfo from '@react-native-community/netinfo';
import { lookupCep } from '@/services/cepLookupService';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const netInfoFetch = NetInfo.fetch as jest.Mock;

describe('lookupCep', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    netInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  });

  it('retorna null sem tentar a busca quando o CEP não tem 8 dígitos', async () => {
    const result = await lookupCep('1234');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('retorna null sem tentar a busca quando está offline', async () => {
    netInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const result = await lookupCep('01310-100');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('retorna o endereço em caso de sucesso', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: 'Avenida Paulista', localidade: 'São Paulo', uf: 'SP' }),
    });

    const result = await lookupCep('01310-100');

    expect(global.fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/');
    expect(result).toEqual({ street: 'Avenida Paulista', city: 'São Paulo', state: 'SP' });
  });

  it('retorna null quando o ViaCEP responde CEP inexistente', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ erro: true }) });
    const result = await lookupCep('00000-000');
    expect(result).toBeNull();
  });

  it('retorna null quando a resposta HTTP não é ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await lookupCep('01310-100');
    expect(result).toBeNull();
  });

  it('retorna null em falha de rede, sem lançar erro', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
    const result = await lookupCep('01310-100');
    expect(result).toBeNull();
  });
});
