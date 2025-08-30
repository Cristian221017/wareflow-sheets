export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: 'production', // Configuração fixa para Lovable
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://vyqnnnyamoovzxmuvtkl.supabase.co',
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cW5ubnlhbW9vdnp4bXV2dGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjQyMDksImV4cCI6MjA3MTA0MDIwOX0.T-2Pp7rIkBAyzg0-7pV__PT5ssDAxFkZZeyIYOS3shY',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'WMS Sistema',
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON) {
  console.error('❌ ENV inválida: configuração Supabase não encontrada');
}