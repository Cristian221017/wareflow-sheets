export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: 'production',
  SUPABASE_URL: 'https://vyqnnnyamoovzxmuvtkl.supabase.co',
  SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cW5ubnlhbW9vdnp4bXV2dGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjQyMDksImV4cCI6MjA3MTA0MDIwOX0.T-2Pp7rIkBAyzg0-7pV__PT5ssDAxFkZZeyIYOS3shY',
  APP_NAME: 'WMS Sistema',
};

export function assertSupabaseEnv() {
  const isValid = !!(ENV.SUPABASE_URL && ENV.SUPABASE_ANON);
  
  if (!isValid && typeof window !== 'undefined') {
    console.error('❌ ENV inválida: configuração Supabase não encontrada');
    console.error('Verifique se SUPABASE_URL e SUPABASE_ANON estão configuradas');
  }
  
  return isValid;
}

// Não lançar erro aqui. Deixe o App decidir o que renderizar (tela de erro amigável).