/// <reference types="jest" />
import { formatCurrencyBRL, maskCep, maskCpfCnpj, maskDateBR, maskPhone, onlyDigits, parseDateBR } from '@/utils/masks';

describe('onlyDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(onlyDigits('(11) 98888-7777')).toBe('11988887777');
  });
});

describe('maskCpfCnpj', () => {
  it('formata como CPF (11 dígitos)', () => {
    expect(maskCpfCnpj('52998224725')).toBe('529.982.247-25');
  });

  it('formata como CNPJ (14 dígitos)', () => {
    expect(maskCpfCnpj('11223344000186')).toBe('11.223.344/0001-86');
  });

  it('vai formatando progressivamente enquanto o usuário digita', () => {
    expect(maskCpfCnpj('529')).toBe('529');
    expect(maskCpfCnpj('5299')).toBe('529.9');
    expect(maskCpfCnpj('529982247')).toBe('529.982.247');
  });
});

describe('maskPhone', () => {
  it('formata celular (11 dígitos, com 9º dígito)', () => {
    expect(maskPhone('11988887777')).toBe('(11) 98888-7777');
  });

  it('formata fixo (10 dígitos)', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });
});

describe('maskCep', () => {
  it('formata CEP com hífen', () => {
    expect(maskCep('01310100')).toBe('01310-100');
  });
});

describe('formatCurrencyBRL', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatCurrencyBRL(1990)).toBe('R$ 19,90');
  });

  it('trata valores não numéricos como zero', () => {
    expect(formatCurrencyBRL(Number.NaN)).toBe('R$ 0,00');
  });
});

describe('maskDateBR / parseDateBR', () => {
  it('maskDateBR formata ddmmaaaa como dd/mm/aaaa', () => {
    expect(maskDateBR('25122026')).toBe('25/12/2026');
  });

  it('parseDateBR converte dígitos válidos numa Date real', () => {
    const date = parseDateBR('25122026');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(11); // dezembro = índice 11
    expect(date?.getDate()).toBe(25);
  });

  it('parseDateBR rejeita datas que não existem (31/02) em vez de normalizar', () => {
    expect(parseDateBR('31022026')).toBeNull();
  });

  it('parseDateBR rejeita quando não tem 8 dígitos', () => {
    expect(parseDateBR('2512')).toBeNull();
  });
});
