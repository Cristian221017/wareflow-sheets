import { supabase } from '@/integrations/supabase/client';
import { ENV } from '@/config/env';

export const debugSupabaseConfig = () => {
  console.log('🔧 === DIAGNÓSTICO SUPABASE COMPLETO ===');
  
  // 1. Verificar variáveis de ambiente
  console.log('📋 Variáveis de ambiente:');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'UNDEFINED');
  console.log('VITE_APP_NAME:', import.meta.env.VITE_APP_NAME);
  
  // 2. Verificar ENV processado
  console.log('⚙️ ENV processado:');
  console.log('ENV.SUPABASE_URL:', ENV.SUPABASE_URL);
  console.log('ENV.SUPABASE_ANON:', ENV.SUPABASE_ANON ? 'DEFINIDA' : 'UNDEFINED');
  console.log('ENV.APP_NAME:', ENV.APP_NAME);
  
  // 3. Verificar cliente Supabase
  console.log('🔌 Cliente Supabase:');
  console.log('supabaseUrl:', (supabase as any).supabaseUrl);
  console.log('supabaseKey:', (supabase as any).supabaseKey ? 'DEFINIDA' : 'UNDEFINED');
  
  // 4. Testar conexão básica
  console.log('🧪 Testando conexões...');
  
  return {
    env: {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      name: import.meta.env.VITE_APP_NAME
    },
    config: {
      url: ENV.SUPABASE_URL,
      key: !!ENV.SUPABASE_ANON,
      name: ENV.APP_NAME
    },
    client: {
      url: (supabase as any).supabaseUrl,
      key: !!(supabase as any).supabaseKey
    }
  };
};

export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testando conexão direta...');
    
    // Teste simples de health check usando uma tabela que existe
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão:', error);
      return { success: false, error };
    }
    
    console.log('✅ Conexão funcionando:', data);
    return { success: true, data };
    
  } catch (err) {
    console.error('💥 Erro crítico na conexão:', err);
    return { success: false, error: err };
  }
};

// Executar debug imediatamente
if (typeof window !== 'undefined') {
  const config = debugSupabaseConfig();
  testSupabaseConnection().then(result => {
    console.log('🏁 Resultado do teste:', result);
  });
}