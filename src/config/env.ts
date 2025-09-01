export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'production',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY,
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'WMS Sistema',
};

export function assertSupabaseEnv() {
  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON) {
    console.error('❌ ENV inválida: configuração Supabase não encontrada');
    console.error('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas corretamente');
    return false;
  }
  return true;
}

// Não lançar erro aqui. Deixe o App decidir o que renderizar (tela de erro amigável).