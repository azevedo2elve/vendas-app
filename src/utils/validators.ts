import { onlyDigits } from './masks';

function calcCpfCheckDigit(base: string): number {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += Number(digit) * weight;
    weight -= 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const base = cpf.slice(0, 9);
  const digit1 = calcCpfCheckDigit(base);
  const digit2 = calcCpfCheckDigit(base + digit1);
  return cpf === base + String(digit1) + String(digit2);
}

function calcCnpjCheckDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const base = cnpj.slice(0, 12);
  const digit1 = calcCnpjCheckDigit(base, weights1);
  const digit2 = calcCnpjCheckDigit(base + digit1, weights2);
  return cnpj === base + String(digit1) + String(digit2);
}

export function isValidCpfOuCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}
