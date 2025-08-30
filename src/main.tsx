import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'
import { debugSupabaseConfig, testSupabaseConnection } from '@/utils/debugSupabase';

// Disponibilizar supabase globalmente
(window as any).supabase = supabase;

// 🔧 DIAGNÓSTICO CRÍTICO - Executar debug imediatamente
console.log('🚨 === INICIANDO DIAGNÓSTICO CRÍTICO ===');
const config = debugSupabaseConfig();
testSupabaseConnection().then(result => {
  console.log('🏁 Resultado do teste de conexão:', result);
});
console.log('🚨 === FIM DO DIAGNÓSTICO INICIAL ===');

// Criar instância do Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
