import { File } from 'expo-file-system';
import { database } from '@/database';
import CompanySettings from '@/database/models/CompanySettings';
import { APP_DISPLAY_NAME } from '@/utils/appInfo';

const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024; // 2MB — evita um data URI gigante no SQLite
const LOGO_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function companySettingsCollection() {
  return database.get<CompanySettings>('company_settings');
}

export type DatabaseSummary = {
  clientsCount: number;
  productsCount: number;
  ordersCount: number;
};

export async function getDatabaseSummary(): Promise<DatabaseSummary> {
  const [clientsCount, productsCount, ordersCount] = await Promise.all([
    database.get('clients').query().fetchCount(),
    database.get('products').query().fetchCount(),
    database.get('orders').query().fetchCount(),
  ]);
  return { clientsCount, productsCount, ordersCount };
}

export async function getOrCreateCompanySettings(): Promise<CompanySettings> {
  const existing = await companySettingsCollection().query().fetch();
  if (existing.length > 0) {
    return existing[0];
  }

  let created!: CompanySettings;
  await database.write(async () => {
    created = await companySettingsCollection().create((record) => {
      record.razaoSocial = '';
      record.document = '';
      record.phone = '';
      record.updatedAt = new Date();
    });
  });
  return created;
}

export type CompanySettingsInput = {
  razaoSocial: string;
  nomeFantasia?: string;
  document: string;
  ie?: string;
  phone: string;
  email?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  pixKey?: string;
  vendedorNome?: string;
  // undefined = não mexe no logo salvo; null = remove o logo; string = novo data URI.
  logoBase64?: string | null;
};

export async function saveCompanySettings(input: CompanySettingsInput): Promise<void> {
  const settings = await getOrCreateCompanySettings();

  await database.write(async () => {
    await settings.update((record) => {
      record.razaoSocial = input.razaoSocial.trim();
      record.nomeFantasia = input.nomeFantasia?.trim() || undefined;
      record.document = input.document.trim();
      record.ie = input.ie?.trim() || undefined;
      record.phone = input.phone.trim();
      record.email = input.email?.trim() || undefined;
      record.addressStreet = input.addressStreet?.trim() || undefined;
      record.addressNumber = input.addressNumber?.trim() || undefined;
      record.addressDistrict = input.addressDistrict?.trim() || undefined;
      record.addressCity = input.addressCity?.trim() || undefined;
      record.addressState = input.addressState?.trim() || undefined;
      record.addressZip = input.addressZip?.trim() || undefined;
      record.pixKey = input.pixKey?.trim() || undefined;
      record.vendedorNome = input.vendedorNome?.trim() || undefined;
      if (input.logoBase64 !== undefined) {
        record.logoBase64 = input.logoBase64 ?? undefined;
      }
      record.updatedAt = new Date();
    });
  });
}

// Nome exibido no cumprimento da HomeScreen (substitui "Bom dia"/"Boa tarde"): nome do vendedor,
// senão o nome da empresa, senão o nome do próprio app.
export function resolveDisplayName(settings: Pick<CompanySettings, 'vendedorNome' | 'nomeFantasia' | 'razaoSocial'> | null): string {
  return settings?.vendedorNome?.trim() || settings?.nomeFantasia?.trim() || settings?.razaoSocial?.trim() || APP_DISPLAY_NAME;
}

// Abre o seletor de arquivos do sistema filtrado por imagem (mesma API já usada em
// backupService — evita instalar expo-image-picker só para isso) e retorna a logo como data URI
// pronta para embutir no HTML do PDF. Retorna null se o usuário cancelar.
export async function pickCompanyLogo(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['image/png', 'image/jpeg'] });
  if (picked.canceled) return null;

  const file = picked.result;
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new Error('Imagem muito grande. Escolha um arquivo de até 2MB.');
  }

  const mimeType = LOGO_MIME_TYPES[file.extension.toLowerCase()];
  if (!mimeType) {
    throw new Error('Formato não suportado. Escolha um arquivo PNG ou JPG.');
  }

  const base64 = await file.base64();
  return `data:${mimeType};base64,${base64}`;
}
