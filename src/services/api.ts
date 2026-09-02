// Chave anon/publishable do Supabase — segura para expor no bundle do app (protegida por RLS
// no lado do banco). A service_role key NUNCA deve ser referenciada aqui.
export const SUPABASE_REST_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

// Número de WhatsApp do suporte (com DDI/DDD, só dígitos ou com máscara — normalizado por
// utils/whatsapp.ts) para o atalho "Enviar ID por WhatsApp" da tela de Configurações.
export const SUPPORT_WHATSAPP_PHONE = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_PHONE;

export function isSupportPhoneConfigured(): boolean {
  return Boolean(SUPPORT_WHATSAPP_PHONE);
}

// E-mail do suporte para onde o vendedor envia o backup quando precisa de ajuda (ex: aparelho
// com problema) — o próprio suporte usa esse backup pra restaurar em outro aparelho.
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

export function isSupportEmailConfigured(): boolean {
  return Boolean(SUPPORT_EMAIL);
}

export function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
}
