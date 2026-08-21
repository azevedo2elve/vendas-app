import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';
import type { LicenseStatus } from '@/types/database';

export default class LicenseControl extends Model {
  static table = 'license_control';

  @field('device_id') declare deviceId: string;
  @date('license_expires_at') declare licenseExpiresAt: Date;
  @field('license_status') declare licenseStatus: LicenseStatus;
  @date('last_opened_at') declare lastOpenedAt: Date;
}
