import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'

// EMERGENCY VERSION - NO CONSOLE SUPPRESSION
console.log('🚨 EMERGENCY MAIN - All suppressions disabled');

// Create QueryClient with minimal config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes  
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Find root element
const container = document.getElementById('root')!;
const root = createRoot(container);

// Simple env check and render
if (!assertSupabaseEnv()) {
  console.error('❌ Supabase environment not configured');
  root.render(<EnvErrorPage />);
} else {
  console.log('✅ Supabase environment OK, loading app...');
  
  // Dynamic import to catch any import errors
  import('@/integrations/supabase/client').then((supabaseModule) => {
    console.log('✅ Supabase client loaded');
    
    // Make available for debugging
    (window as any).supabase = supabaseModule.supabase;
    
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  }).catch((error) => {
    console.error('❌ Failed to load Supabase client:', error);
    root.render(<div>Error loading Supabase: {error.message}</div>);
  });
}