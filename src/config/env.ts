export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'production',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY,
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'WMS Sistema',
};

export function assertSupabaseEnv() {
  const isValid = !!(ENV.SUPABASE_URL && ENV.SUPABASE_ANON);
  
  if (!isValid && typeof window !== 'undefined') {
    // Usar productionLogger - MIGRAÇÃO CRÍTICA IMPLEMENTADA
    try {
      const { error } = require('@/utils/productionLogger');
      error('❌ ENV inválida: configuração Supabase não encontrada');
      error('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas');
    } catch {
      // Fallback para console apenas se logger não estiver disponível
      console.error('❌ ENV inválida: configuração Supabase não encontrada');
      console.error('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas');
    }
  }
  
  return isValid;
}

// Não lançar erro aqui. Deixe o App decidir o que renderizar (tela de erro amigável).