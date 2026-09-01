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
  reason?: 'clock_tampered' | 'offline' | 'server_rejected' | 'not_registered' | 'grace_period_exceeded';
  deviceId: string;
  expiresAt: Date;
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

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Já passou pelo menos um dia completo desde o vencimento (não é mais "o dia que venceu", é o
// dia seguinte em diante) — usado para escalar de `expired` (somente leitura) para `blocked`.
function isPastGraceDay(expiresAt: Date, now: Date): boolean {
  return startOfDay(now) > startOfDay(expiresAt);
}

async function isOnline(): Promise<boolean> {
  const netState = await NetInfo.fetch();
  return netState.isConnected === true && netState.isInternetReachable !== false;
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

// Leitura passiva do estado local da licença, sem checar o Supabase nem alterar nada — usada
// pela tela de Configurações para exibir o status atual antes do usuário pedir uma verificação
// explícita (botão "Verificar Licença Agora", que chama evaluateLicense()). Ao contrário de
// evaluateLicense(), nunca marca a licença como 'blocked'/'expired' como efeito colateral.
export async function getCurrentLicenseSnapshot(): Promise<{
  status: LicenseStatus;
  expiresAt: Date;
  deviceId: string;
}> {
  const license = await getOrCreateLicense();
  return { status: license.licenseStatus, expiresAt: license.licenseExpiresAt, deviceId: license.deviceId };
}

export async function evaluateLicense(): Promise<LicenseCheckResult> {
  const license = await getOrCreateLicense();
  const now = Date.now();
  const nowDate = new Date(now);

  // Anti-fraude de relógio: NÃO atualiza last_opened_at aqui. Se atualizássemos com um
  // "agora" potencialmente fraudado, o usuário poderia voltar o relógio, ser bloqueado,
  // e depois avançar o relógio de novo para "limpar" o rastro do último uso legítimo.
  if (now < license.lastOpenedAt.getTime()) {
    await persistStatus(license, 'blocked');
    return { status: 'blocked', reason: 'clock_tampered', deviceId: license.deviceId, expiresAt: license.licenseExpiresAt };
  }

  // Sempre tenta validar com o servidor quando possível — na abertura do app e a cada 5 min
  // (useLicenseGuard), esteja a licença perto ou longe do vencimento. Se conseguir, a licença
  // é renovada/confirmada sem o vendedor perceber nada; se não der (sem internet, Supabase não
  // configurado, timeout), não mostra nenhum erro — só cai no tratamento local abaixo.
  if (isSupabaseConfigured() && (await isOnline())) {
    try {
      const { expiresAt } = await fetchLicenseFromSupabase(license.deviceId);
      await persistActive(license, expiresAt, now);
      return { status: 'active', deviceId: license.deviceId, expiresAt: new Date(expiresAt) };
    } catch (error) {
      if (error instanceof DeviceNotRegisteredError) {
        await persistStatus(license, 'blocked', now);
        return { status: 'blocked', reason: 'not_registered', deviceId: license.deviceId, expiresAt: license.licenseExpiresAt };
      }
      if (error instanceof LicenseRenewalRejectedError) {
        await persistStatus(license, 'blocked', now);
        return { status: 'blocked', reason: 'server_rejected', deviceId: license.deviceId, expiresAt: license.licenseExpiresAt };
      }
      // Falha de rede/timeout apesar do NetInfo dizer online: trata como offline abaixo, sem
      // mostrar erro nenhum pro vendedor.
    }
  }

  // Sem internet (ou Supabase não configurado, ou falha de rede acima). Nunca bloqueia só por
  // isso — só bloqueia se a validade já registrada for anterior a hoje (1 dia de tolerância a
  // partir do vencimento, contando o próprio dia em que venceu).
  if (now < license.licenseExpiresAt.getTime()) {
    await persistActive(license, license.licenseExpiresAt.getTime(), now);
    return { status: 'active', deviceId: license.deviceId, expiresAt: license.licenseExpiresAt };
  }

  if (isPastGraceDay(license.licenseExpiresAt, nowDate)) {
    await persistStatus(license, 'blocked', now);
    return { status: 'blocked', reason: 'grace_period_exceeded', deviceId: license.deviceId, expiresAt: license.licenseExpiresAt };
  }

  await persistStatus(license, 'expired', now);
  return { status: 'expired', reason: 'offline', deviceId: license.deviceId, expiresAt: license.licenseExpiresAt };
}
