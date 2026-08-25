import { database } from '@/database';
import CompanySettings from '@/database/models/CompanySettings';

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
      record.updatedAt = new Date();
    });
  });
}
