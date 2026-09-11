/// <reference types="jest" />
/// <reference types="node" />
import { backupSchema } from '@/services/backupService';

// backupService importa `database` no topo do arquivo (para as demais funções do módulo, não
// usadas neste teste) — precisa de um mock só para o import não estourar, já que WatermelonDB
// exige um adapter nativo/SQLite que não existe em ambiente de teste Node.
jest.mock('@/database', () => ({
  database: { get: () => ({ query: () => ({ fetch: async () => [] }) }), write: async (fn: () => unknown) => fn() },
}));

// Regressão: um backup exportado pelo próprio app tinha campos opcionais preenchidos com `null`
// de verdade (WatermelonDB devolve `null` em tempo de execução para colunas SQLite vazias, mesmo
// em campos tipados como `string | undefined` nos models) — reimportar esse mesmo arquivo falhava
// porque o schema só aceitava `string | undefined`, não `string | null | undefined`. Ver Fase 15
// em docs/06-changelog-tarefas.md.
describe('backupSchema — round-trip exportar→importar', () => {
  it('aceita um backup com campos opcionais explicitamente null (formato real exportado pelo app)', () => {
    const backup = {
      exported_at: '2026-09-11T06:35:01.018Z',
      app_version: '1.0.0',
      clients: [
        {
          name: 'Cliente Teste',
          document: '04212116014',
          phone: '51995141997',
          address_street: 'Rua Teste',
          address_number: '100',
          address_complement: null,
          address_city: 'Canoas',
          address_state: 'RS',
          address_zip: null,
        },
      ],
      categories: [{ name: 'Bebidas' }],
      products: [{ name: 'Refrigerante 2L', category_name: null, price: 1000, unit: 'UN' }],
      orders: [
        {
          client_document: '04212116014',
          status: 'pending',
          total_gross: 1000,
          discount_total: 0,
          total_net: 1000,
          payment_method: 'dinheiro',
          notes: null,
          order_number: 1,
          delivery_date: null,
          created_at: '2026-09-09T20:41:33.244Z',
          items: [
            {
              product_name_snapshot: 'Refrigerante 2L',
              unit_price: 1000,
              quantity: 1,
              discount_value: 0,
              subtotal: 1000,
            },
          ],
        },
      ],
    };

    const result = backupSchema.safeParse(backup);
    expect(result.success).toBe(true);
  });

  it('continua aceitando campos opcionais simplesmente ausentes (undefined)', () => {
    const backup = {
      exported_at: '2026-09-11T06:35:01.018Z',
      app_version: '1.0.0',
      clients: [{ name: 'Cliente Teste', document: '04212116014', phone: '51995141997' }],
      categories: [],
      products: [],
      orders: [],
    };

    const result = backupSchema.safeParse(backup);
    expect(result.success).toBe(true);
  });
});
