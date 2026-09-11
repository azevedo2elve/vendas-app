/// <reference types="jest" />
import { isValidCNPJ, isValidCPF, isValidCpfOuCnpj } from '@/utils/validators';

// CPF/CNPJ sintéticos, gerados com o mesmo algoritmo de dígito verificador usado pelo
// validador — não pertencem a nenhuma pessoa/empresa real, só satisfazem o cálculo.
const VALID_CPF = '529.982.247-25';
const VALID_CNPJ = '11.223.344/0001-86';

describe('isValidCPF', () => {
  it('aceita um CPF com dígitos verificadores corretos', () => {
    expect(isValidCPF(VALID_CPF)).toBe(true);
  });

  it('aceita o mesmo CPF só com dígitos (sem máscara)', () => {
    expect(isValidCPF('52998224725')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais (ex: 111.111.111-11)', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com quantidade errada de dígitos', () => {
    expect(isValidCPF('123.456.789')).toBe(false);
  });
});

describe('isValidCNPJ', () => {
  it('aceita um CNPJ com dígitos verificadores corretos', () => {
    expect(isValidCNPJ(VALID_CNPJ)).toBe(true);
  });

  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(isValidCNPJ('11.223.344/0001-87')).toBe(false);
  });

  it('rejeita CNPJ com todos os dígitos iguais', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
  });
});

describe('isValidCpfOuCnpj', () => {
  it('valida como CPF quando tem 11 dígitos', () => {
    expect(isValidCpfOuCnpj(VALID_CPF)).toBe(true);
  });

  it('valida como CNPJ quando tem 14 dígitos', () => {
    expect(isValidCpfOuCnpj(VALID_CNPJ)).toBe(true);
  });

  it('rejeita quantidade de dígitos que não é nem CPF nem CNPJ', () => {
    expect(isValidCpfOuCnpj('123')).toBe(false);
  });
});
