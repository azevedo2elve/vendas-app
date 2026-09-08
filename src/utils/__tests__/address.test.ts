/// <reference types="jest" />
import { formatClientCityLine, formatClientFullAddress, formatClientStreetLine } from '@/utils/address';

describe('formatClientStreetLine', () => {
  it('junta rua, número e complemento', () => {
    expect(
      formatClientStreetLine({ addressStreet: 'Rua Exemplo', addressNumber: '123', addressComplement: 'Sala 4' })
    ).toBe('Rua Exemplo, 123 - Sala 4');
  });

  it('omite o complemento quando ausente', () => {
    expect(formatClientStreetLine({ addressStreet: 'Rua Exemplo', addressNumber: '123' })).toBe('Rua Exemplo, 123');
  });

  it('retorna string vazia quando não há endereço', () => {
    expect(formatClientStreetLine({})).toBe('');
  });
});

describe('formatClientCityLine', () => {
  it('junta cidade e estado', () => {
    expect(formatClientCityLine({ addressCity: 'São Paulo', addressState: 'SP' })).toBe('São Paulo - SP');
  });
});

describe('formatClientFullAddress', () => {
  it('monta a linha completa com CEP mascarado', () => {
    const full = formatClientFullAddress({
      addressStreet: 'Rua Exemplo',
      addressNumber: '123',
      addressComplement: 'Sala 4',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZip: '01310100',
    });
    expect(full).toBe('Rua Exemplo, 123 - Sala 4, São Paulo - SP, CEP 01310-100');
  });

  it('omite partes ausentes sem deixar separadores soltos', () => {
    expect(formatClientFullAddress({ addressCity: 'São Paulo', addressState: 'SP' })).toBe('São Paulo - SP');
  });
});
