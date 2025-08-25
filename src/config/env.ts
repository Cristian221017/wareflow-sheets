export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: import.meta.env.VITE_ENV ?? 'staging', // 'staging'|'prod'|'preview'
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL!,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY!,
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'WMS',
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON) {
  console.error('ENV inválida: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}