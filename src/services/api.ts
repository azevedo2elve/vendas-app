// Chave anon/publishable do Supabase — segura para expor no bundle do app (protegida por RLS
// no lado do banco). A service_role key NUNCA deve ser referenciada aqui.
export const SUPABASE_REST_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
}
