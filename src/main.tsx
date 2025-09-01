import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'

// Initialize security audit
import '@/utils/securityAudit';

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

const root = createRoot(document.getElementById("root")!);

if (!assertSupabaseEnv()) {
  root.render(<EnvErrorPage />);
} else {
  // Só importar e disponibilizar supabase quando ENV estiver válida
  import('@/integrations/supabase/client').then(({ supabase }) => {
    (window as any).supabase = supabase;
  });
  
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
