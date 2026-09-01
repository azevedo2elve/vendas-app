import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class CompanySettings extends Model {
  static table = 'company_settings';

  @field('razao_social') declare razaoSocial: string;
  @field('nome_fantasia') declare nomeFantasia?: string;
  @field('document') declare document: string;
  @field('ie') declare ie?: string;
  @field('phone') declare phone: string;
  @field('email') declare email?: string;
  @field('address_street') declare addressStreet?: string;
  @field('address_number') declare addressNumber?: string;
  @field('address_district') declare addressDistrict?: string;
  @field('address_city') declare addressCity?: string;
  @field('address_state') declare addressState?: string;
  @field('address_zip') declare addressZip?: string;
  @field('pix_key') declare pixKey?: string;
  @field('vendedor_nome') declare vendedorNome?: string;
  // Logo da empresa como data URI (`data:image/png;base64,...`) — guardada direto no banco em
  // vez de um caminho de arquivo separado, pra sempre estar disponível offline na hora de montar
  // o HTML do PDF, sem depender de permissão de leitura de filesystem naquele momento.
  @field('logo_base64') declare logoBase64?: string;

  @date('updated_at') declare updatedAt: Date;
}
