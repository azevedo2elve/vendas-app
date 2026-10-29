/// <reference types="jest" />
/// <reference types="node" />
import { importBackup, type BackupData } from '@/services/backupService';

// Fake mínimo do WatermelonDB: `prepareCreate` imita o real — o registro já nasce com
// `created_at` = "agora" no raw e só depois o builder roda (ver Model._prepareCreate).
const MOCK_IMPORT_TIME_MS = Date.parse('2026-10-28T22:00:00.000Z');
type FakeRecord = { id: string; _raw: Record<string, unknown>; [key: string]: unknown };
const mockCreated: Record<string, FakeRecord[]> = {};

jest.mock('@/database', () => {
  let seq = 0;
  return {
    database: {
      get: (table: string) => ({
        query: () => ({ fetch: async () => [] }),
        prepareCreate: (builder: (record: FakeRecord) => void) => {
          const record: FakeRecord = { id: `${table}-${++seq}`, _raw: { created_at: MOCK_IMPORT_TIME_MS } };
          builder(record);
          (mockCreated[table] ??= []).push(record);
          return record;
        },
      }),
      write: async (fn: () => unknown) => fn(),
      batch: async () => undefined,
    },
  };
});

function backupWithOrder(createdAt: string): BackupData {
  return {
    app_version: '1.2.0',
    exported_at: '2026-10-28T21:08:02.468Z',
    clients: [{ name: 'Cliente Teste', document: '04212116014', phone: '51995141997' }],
    categories: [],
    products: [],
    orders: [
      {
        client_document: '04212116014',
        status: 'pending',
        total_gross: 121433,
        discount_total: 0,
        total_net: 121433,
        payment_method: 'pix',
        order_number: 1,
        payment_due_at: '2026-10-30T03:00:00.000Z',
        created_at: createdAt,
        items: [],
      },
    ],
  } as BackupData;
}

describe('importBackup — data de criação dos pedidos', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockCreated)) delete mockCreated[key];
  });

  // Regressão (2026-10-28): reimportar o backup do cliente jogava todas as vendas para o dia da
  // importação — "Vendido hoje" somava o histórico inteiro e os dias anteriores ficavam vazios.
  it('restaura o created_at original do backup, não a data da importação', async () => {
    await importBackup(backupWithOrder('2026-10-27T19:09:01.097Z'));

    expect(mockCreated.orders).toHaveLength(1);
    expect(mockCreated.orders[0]._raw.created_at).toBe(Date.parse('2026-10-27T19:09:01.097Z'));
  });

  it('mantém a data da importação quando o created_at do backup é inválido', async () => {
    await importBackup(backupWithOrder('data-quebrada'));

    expect(mockCreated.orders[0]._raw.created_at).toBe(MOCK_IMPORT_TIME_MS);
  });
});
