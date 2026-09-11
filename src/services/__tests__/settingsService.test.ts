/// <reference types="jest" />
/// <reference types="node" />
import { detectImageMimeType } from '@/services/settingsService';

// settingsService importa `database` no topo do arquivo (para as demais funções do módulo, não
// usadas neste teste) — precisa de um mock só para o import não estourar, já que WatermelonDB
// exige um adapter nativo/SQLite que não existe em ambiente de teste Node.
jest.mock('@/database', () => ({
  database: { get: () => ({ query: () => ({ fetch: async () => [] }) }), write: async (fn: () => unknown) => fn() },
}));

describe('detectImageMimeType', () => {
  it('reconhece PNG pela assinatura em base64, independente do nome/extensão do arquivo', () => {
    // Prefixo determinístico dos bytes 89 50 4E 47 0D 0A ... codificados em base64.
    expect(detectImageMimeType('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')).toBe('image/png');
  });

  it('reconhece JPEG pela assinatura em base64, independente do nome/extensão do arquivo', () => {
    // Prefixo determinístico dos bytes FF D8 FF ... codificados em base64.
    expect(detectImageMimeType('/9j/4AAQSkZJRgABAQEAYABgAAD')).toBe('image/jpeg');
  });

  it('retorna null para conteúdo que não é PNG nem JPEG', () => {
    expect(detectImageMimeType('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==')).toBeNull(); // GIF
  });

  it('retorna null para string vazia', () => {
    expect(detectImageMimeType('')).toBeNull();
  });
});
