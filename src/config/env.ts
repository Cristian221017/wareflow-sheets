export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'production',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY,
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'WMS Sistema',
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON) {
  console.error('❌ ENV inválida: configuração Supabase não encontrada');
  throw new Error('Missing Supabase configuration - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}