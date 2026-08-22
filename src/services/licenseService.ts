import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { database } from '@/database';
import LicenseControl from '@/database/models/LicenseControl';
import type { LicenseStatus } from '@/types/database';
import { isSupabaseConfigured, SUPABASE_REST_URL, supabaseHeaders } from './api';

// Período de teste concedido na primeira execução, antes de qualquer contato com o servidor.
const TRIAL_PERIOD_MS = 15 * 24 * 60 * 60 * 1000;

export type LicenseCheckResult = {
  status: LicenseStatus;
  reason?: 'clock_tampered' | 'offline' | 'server_rejected' | 'not_registered';
  deviceId: string;
};

type RemoteLicenseRecord = {
  device_id: string;
  license_expires_at: string;
  license_status: LicenseStatus;
};

class LicenseRenewalRejectedError extends Error {}
class DeviceNotRegisteredError extends Error {}

function licenseCollection() {
  return database.get<LicenseControl>('license_control');
}

async function getOrCreateLicense(): Promise<LicenseControl> {
  const existing = await licenseCollection().query().fetch();
  if (existing.length > 0) {
    return existing[0];
  }

  const now = Date.now();
  let created!: LicenseControl;
  await database.write(async () => {
    created = await licenseCollection().create((record) => {
      record.deviceId = Crypto.randomUUID();
      record.licenseExpiresAt = new Date(now + TRIAL_PERIOD_MS);
      record.licenseStatus = 'active';
      record.lastOpenedAt = new Date(now);
    });
  });
  return created;
}

async function fetchLicenseFromSupabase(deviceId: string): Promise<{ expiresAt: number; status: LicenseStatus }> {
  const query = new URLSearchParams({
    device_id: `eq.${deviceId}`,
    select: 'device_id,license_expires_at,license_status',
  });
  const response = await fetch(`${SUPABASE_REST_URL}/licenses?${query.toString()}`, {
    method: 'GET',
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new LicenseRenewalRejectedError(`supabase_http_${response.status}`);
  }

  const rows: RemoteLicenseRecord[] = await response.json();
  const record = rows[0];

  if (!record) {
    throw new DeviceNotRegisteredError('device_not_registered');
  }

  if (record.license_status !== 'active') {
    throw new LicenseRenewalRejectedError(`remote_status_${record.license_status}`);
  }

  return { expiresAt: new Date(record.license_expires_at).getTime(), status: record.license_status };
}

async function persistActive(license: LicenseControl, expiresAt: number, now: number) {
  await database.write(async () => {
    await license.update((record) => {
      record.licenseExpiresAt = new Date(expiresAt);
      record.licenseStatus = 'active';
      record.lastOpenedAt = new Date(now);
    });
  });
}

async function persistStatus(license: LicenseControl, status: LicenseStatus, now?: number) {
  await database.write(async () => {
    await license.update((record) => {
      record.licenseStatus = status;
      if (now !== undefined) {
        record.lastOpenedAt = new Date(now);
      }
    });
  });
}

// Só para testes manuais (ex: botão de debug na HomeScreen) — consulta o Supabase mas
// NÃO persiste nada localmente, ao contrário de evaluateLicense().
export async function testSupabaseFetch(): Promise<{ ok: boolean; deviceId: string; message: string }> {
  const license = await getOrCreateLicense();

  if (!isSupabaseConfigured()) {
    return { ok: false, deviceId: license.deviceId, message: 'Supabase não configurado (.env ausente).' };
  }

  try {
    const { expiresAt, status } = await fetchLicenseFromSupabase(license.deviceId);
    const expiresAtLabel = new Date(expiresAt).toLocaleString('pt-BR');
    return { ok: true, deviceId: license.deviceId, message: `status=${status}, expira em ${expiresAtLabel}` };
  } catch (error) {
    if (error instanceof DeviceNotRegisteredError) {
      return { ok: false, deviceId: license.deviceId, message: 'Dispositivo não encontrado na tabela licenses (array vazio).' };
    }
    if (error instanceof LicenseRenewalRejectedError) {
      return { ok: false, deviceId: license.deviceId, message: `Rejeitado pelo Supabase: ${error.message}` };
    }
    return { ok: false, deviceId: license.deviceId, message: `Erro de rede/fetch: ${String(error)}` };
  }
}

export async function evaluateLicense(): Promise<LicenseCheckResult> {
  const license = await getOrCreateLicense();
  const now = Date.now();

  // Anti-fraude de relógio: NÃO atualiza last_opened_at aqui. Se atualizássemos com um
  // "agora" potencialmente fraudado, o usuário poderia voltar o relógio, ser bloqueado,
  // e depois avançar o relógio de novo para "limpar" o rastro do último uso legítimo.
  if (now < license.lastOpenedAt.getTime()) {
    await persistStatus(license, 'blocked');
    return { status: 'blocked', reason: 'clock_tampered', deviceId: license.deviceId };
  }

  if (now < license.licenseExpiresAt.getTime()) {
    await persistActive(license, license.licenseExpiresAt.getTime(), now);
    return { status: 'active', deviceId: license.deviceId };
  }

  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected === true && netState.isInternetReachable !== false;

  if (!isOnline || !isSupabaseConfigured()) {
    await persistStatus(license, 'expired', now);
    return { status: 'expired', reason: 'offline', deviceId: license.deviceId };
  }

  try {
    const { expiresAt } = await fetchLicenseFromSupabase(license.deviceId);
    await persistActive(license, expiresAt, now);
    return { status: 'active', deviceId: license.deviceId };
  } catch (error) {
    if (error instanceof DeviceNotRegisteredError) {
      await persistStatus(license, 'blocked', now);
      return { status: 'blocked', reason: 'not_registered', deviceId: license.deviceId };
    }
    if (error instanceof LicenseRenewalRejectedError) {
      await persistStatus(license, 'blocked', now);
      return { status: 'blocked', reason: 'server_rejected', deviceId: license.deviceId };
    }
    // Falha de rede/timeout apesar do NetInfo reportar conexão: trata como expirado offline.
    await persistStatus(license, 'expired', now);
    return { status: 'expired', reason: 'offline', deviceId: license.deviceId };
  }
}
