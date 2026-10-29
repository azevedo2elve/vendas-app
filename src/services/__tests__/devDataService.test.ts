/// <reference types="jest" />
/// <reference types="node" />
import { clearAllBusinessData } from '@/services/devDataService';
import { deleteProductPhoto } from '@/services/productPhotoService';

const mockFetchedTables: string[] = [];
const mockDestroyed: string[] = [];

jest.mock('@/database', () => ({
  database: {
    get: (table: string) => ({
      query: () => ({
        fetch: async () => {
          mockFetchedTables.push(table);
          const photoPath = table === 'products' ? 'file:///fotos/a.jpg' : undefined;
          return [1, 2].map((n) => ({
            photoPath,
            prepareDestroyPermanently: () => `${table}-${n}`,
          }));
        },
      }),
    }),
    write: async (fn: () => unknown) => fn(),
    batch: async (...ops: string[]) => {
      mockDestroyed.push(...ops);
    },
  },
}));

jest.mock('@/services/productPhotoService', () => ({ deleteProductPhoto: jest.fn(async () => undefined) }));

describe('clearAllBusinessData', () => {
  it('apaga de vez pedidos, itens, clientes, produtos e categorias — e nada da licença/empresa', async () => {
    const result = await clearAllBusinessData();

    expect(result).toEqual({ orders: 2, clients: 2, products: 2, categories: 2 });
    expect(mockFetchedTables.sort()).toEqual(['categories', 'clients', 'order_items', 'orders', 'products']);
    expect(mockFetchedTables).not.toContain('license_control');
    expect(mockFetchedTables).not.toContain('company_settings');
    expect(mockDestroyed).toHaveLength(10);
    expect(deleteProductPhoto).toHaveBeenCalledTimes(2);
    expect(deleteProductPhoto).toHaveBeenCalledWith('file:///fotos/a.jpg');
  });
});
