/// <reference types="jest" />
import { Linking } from 'react-native';
import { openWhatsApp } from '@/utils/whatsapp';

describe('openWhatsApp', () => {
  it('prefixa o DDI 55 quando o telefone não vem com ele', async () => {
    await openWhatsApp('(11) 98888-7777');
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/5511988887777');
  });

  it('não duplica o DDI quando o telefone já vem com 55', async () => {
    await openWhatsApp('55 11 98888-7777');
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/5511988887777');
  });

  it('inclui a mensagem como query string, URL-encoded', async () => {
    await openWhatsApp('11988887777', 'Olá, tudo bem?');
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/5511988887777?text=Ol%C3%A1%2C%20tudo%20bem%3F');
  });

  it('não adiciona "?text=" quando não há mensagem', async () => {
    await openWhatsApp('11988887777');
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/5511988887777');
  });
});
