/// <reference types="jest" />
/// <reference types="node" />
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { database } from '@/database';
import { isSupabaseConfigured } from '@/services/api';
import { evaluateLicense } from '@/services/licenseService';

// Mocka a camada de persistência (WatermelonDB precisa de um adapter nativo/SQLite que não
// existe em ambiente de teste Node) por uma "tabela" em memória simples — o suficiente pra
// exercitar a árvore de decisão real de evaluateLicense() sem precisar de um banco de verdade.
jest.mock('@/database', () => {
  let records: any[] = [];
  const collection = {
    query: () => ({ fetch: async () => records }),
    create: async (fn: (record: any) => void) => {
      const record: any = {};
      fn(record);
      record.update = async (updateFn: (r: any) => void) => {
        updateFn(record);
      };
      records.push(record);
      return record;
    },
  };
  return {
    database: {
      get: () => collection,
      write: async (fn: () => unknown) => {
        await fn();
      },
      __setRecords: (newRecords: any[]) => {
        records = newRecords;
      },
    },
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'generated-device-id'),
}));

jest.mock('@/services/api', () => ({
  isSupabaseConfigured: jest.fn(() => false),
  SUPABASE_REST_URL: 'https://fake.supabase.co/rest/v1',
  SUPABASE_ANON_KEY: 'fake-anon-key',
  supabaseHeaders: () => ({ apikey: 'fake-anon-key', Authorization: 'Bearer fake-anon-key', 'Content-Type': 'application/json' }),
}));

const fakeDatabase = database as unknown as { __setRecords: (records: any[]) => void };
const netInfoFetch = NetInfo.fetch as jest.Mock;
const supabaseConfigured = isSupabaseConfigured as jest.Mock;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function makeLicenseRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'existing-id',
    deviceId: 'existing-device-id',
    licenseExpiresAt: new Date(Date.now() + ONE_DAY_MS),
    licenseStatus: 'active',
    lastOpenedAt: new Date(Date.now() - ONE_DAY_MS),
    ...overrides,
    update: undefined as unknown, // será sobrescrito pelo mock de @/database ao ser criado via create()
  };
}

// Registra o record diretamente na "tabela" fake, já com um update() funcional — usado quando o
// teste precisa partir de um estado pré-existente (evaluateLicense não passa pelo create() nesse caso).
function seedLicense(overrides: Partial<Record<string, unknown>> = {}) {
  const record: any = makeLicenseRecord(overrides);
  record.update = async (fn: (r: any) => void) => {
    fn(record);
  };
  fakeDatabase.__setRecords([record]);
  return record;
}

describe('licenseService.evaluateLicense', () => {
  beforeEach(() => {
    fakeDatabase.__setRecords([]);
    netInfoFetch.mockReset().mockResolvedValue({ isConnected: false, isInternetReachable: false });
    supabaseConfigured.mockReset().mockReturnValue(false);
    global.fetch = jest.fn();
  });

  describe('anti-fraude de relógio', () => {
    it('bloqueia quando "agora" é anterior ao último lastOpenedAt registrado', async () => {
      const record = seedLicense({ lastOpenedAt: new Date(Date.now() + 10 * ONE_DAY_MS) });

      const result = await evaluateLicense();

      expect(result.status).toBe('blocked');
      expect(result.reason).toBe('clock_tampered');
      expect(record.licenseStatus).toBe('blocked');
    });
  });

  describe('primeira execução (sem licença local ainda)', () => {
    it('cria a licença com trial de 15 dias e device_id novo, e libera o uso', async () => {
      const result = await evaluateLicense();

      expect(result.status).toBe('active');
      expect(result.deviceId).toBe('generated-device-id');
      expect(Crypto.randomUUID).toHaveBeenCalled();
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('validação remota (Supabase configurado e online)', () => {
    beforeEach(() => {
      supabaseConfigured.mockReturnValue(true);
      netInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    });

    it('renova a licença quando o Supabase confirma o dispositivo como ativo', async () => {
      const newExpiresAt = new Date(Date.now() + 30 * ONE_DAY_MS).toISOString();
      const record = seedLicense({ licenseExpiresAt: new Date(Date.now() - ONE_DAY_MS) });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [{ device_id: record.deviceId, license_expires_at: newExpiresAt, license_status: 'active' }],
      });

      const result = await evaluateLicense();

      expect(result.status).toBe('active');
      expect(result.expiresAt.toISOString()).toBe(newExpiresAt);
      expect(record.licenseStatus).toBe('active');
    });

    it('bloqueia com not_registered quando o Supabase não encontra o device_id (array vazio)', async () => {
      const record = seedLicense();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });

      const result = await evaluateLicense();

      expect(result.status).toBe('blocked');
      expect(result.reason).toBe('not_registered');
      expect(record.licenseStatus).toBe('blocked');
    });

    it('bloqueia com server_rejected quando o Supabase retorna a licença como não-ativa', async () => {
      const record = seedLicense();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [{ device_id: record.deviceId, license_expires_at: new Date().toISOString(), license_status: 'blocked' }],
      });

      const result = await evaluateLicense();

      expect(result.status).toBe('blocked');
      expect(result.reason).toBe('server_rejected');
    });

    it('bloqueia com server_rejected quando o Supabase responde com HTTP de erro', async () => {
      seedLicense();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

      const result = await evaluateLicense();

      expect(result.status).toBe('blocked');
      expect(result.reason).toBe('server_rejected');
    });

    it('cai no tratamento local (sem erro visível) se o fetch falhar apesar do NetInfo dizer "online"', async () => {
      seedLicense({ licenseExpiresAt: new Date(Date.now() + ONE_DAY_MS) });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('timeout'));

      const result = await evaluateLicense();

      expect(result.status).toBe('active');
    });
  });

  describe('sem internet (ou Supabase não configurado) — nunca bloqueia só por isso', () => {
    it('mantém ativa se a validade local ainda não passou', async () => {
      seedLicense({ licenseExpiresAt: new Date(Date.now() + ONE_DAY_MS) });

      const result = await evaluateLicense();

      expect(result.status).toBe('active');
    });

    it('vira "expired" (somente leitura) no próprio dia do vencimento', async () => {
      // Venceu há poucas horas, mas ainda é o mesmo dia-calendário do vencimento.
      seedLicense({ licenseExpiresAt: new Date(Date.now() - 60 * 60 * 1000) });

      const result = await evaluateLicense();

      expect(result.status).toBe('expired');
      expect(result.reason).toBe('offline');
    });

    it('escala pra "blocked" quando já passou pelo menos 1 dia inteiro do vencimento', async () => {
      seedLicense({ licenseExpiresAt: new Date(Date.now() - 2 * ONE_DAY_MS) });

      const result = await evaluateLicense();

      expect(result.status).toBe('blocked');
      expect(result.reason).toBe('grace_period_exceeded');
    });
  });
});
