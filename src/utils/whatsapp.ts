import { Linking } from 'react-native';
import { onlyDigits } from './masks';

export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  const digits = onlyDigits(phone);
  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  await Linking.openURL(`https://wa.me/${withCountryCode}${query}`);
}
