import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'

// Simple and clean initialization - no security audit or complex scripts

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Suppress console warnings for production
if (import.meta.env.MODE === 'production') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Suppress specific warnings
      if (message.includes('Unrecognized feature') || 
          message.includes('sandbox attribute') ||
          message.includes('deferred DOM Node')) {
        return;
      }
    }
    originalWarn.apply(console, args);
  };
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

if (!assertSupabaseEnv()) {
  root.render(<EnvErrorPage />);
} else {
  // Import supabase only when ENV is valid and make it available for debugging
  import('@/integrations/supabase/client').then(({ supabase }) => {
    (window as any).supabase = supabase;
  }).catch(() => {
    // Silent fail to prevent loading issues
  });
  
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
