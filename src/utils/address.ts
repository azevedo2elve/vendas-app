import { maskCep } from './masks';

export type ClientAddressLike = {
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
};

// "Rua Exemplo, 123 - Sala 4"
export function formatClientStreetLine(client: ClientAddressLike): string {
  const streetAndNumber = [client.addressStreet, client.addressNumber].filter(Boolean).join(', ');
  const complement = client.addressComplement?.trim();
  return [streetAndNumber, complement].filter(Boolean).join(' - ');
}

// "São Paulo - SP"
export function formatClientCityLine(client: ClientAddressLike): string {
  return [client.addressCity, client.addressState].filter(Boolean).join(' - ');
}

// Linha única com tudo, usada em listagens (ex: card do cliente): "Rua Exemplo, 123 - Sala 4,
// São Paulo - SP, CEP 01310-100"
export function formatClientFullAddress(client: ClientAddressLike): string {
  const parts = [formatClientStreetLine(client), formatClientCityLine(client)].filter(Boolean);
  if (client.addressZip) {
    parts.push(`CEP ${maskCep(client.addressZip)}`);
  }
  return parts.join(', ');
}
