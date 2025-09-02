import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'
import { emergencyDebugger } from '@/utils/emergencyDebugger'

// 🚨 EMERGENCY MODE - ALL SUPPRESSIONS DISABLED TO REVEAL ERRORS
console.log('🚨 EMERGENCY MODE ACTIVATED - Console suppressions disabled');
console.log('🔍 All errors will now be visible to diagnose the critical issue');

// Store original console methods for emergency restore
(window as any)._debugConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Global debugging tools available
if (typeof window !== 'undefined') {
  (window as any).emergencyDebugger = emergencyDebugger;
  (window as any).restoreConsole = () => emergencyDebugger.restoreConsole();
  
  console.log('✅ Emergency debugger available: restoreConsole()');
}

// Create QueryClient with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes  
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Simple initialization - catch any errors here
console.log('🔍 Finding root element...');
const container = document.getElementById('root');
if (!container) {
  console.error('❌ CRITICAL: Root element not found!');
  throw new Error('Root element with id="root" not found in DOM');
}

console.log('✅ Root element found, creating React root...');
const root = createRoot(container);

// Check Supabase environment
console.log('🔍 Checking Supabase environment...');
if (!assertSupabaseEnv()) {
  console.error('❌ Supabase environment not configured');
  root.render(<EnvErrorPage />);
} else {
  console.log('✅ Supabase environment OK, loading app...');
  
  // Dynamic import to catch any import errors
  import('@/integrations/supabase/client').then((supabaseModule) => {
    console.log('✅ Supabase client loaded successfully');
    
    // Make available for debugging
    (window as any).supabase = supabaseModule.supabase;
    
    console.log('🚀 Rendering React app...');
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
    console.log('✅ React app rendered successfully');
    
  }).catch((error) => {
    console.error('❌ CRITICAL: Failed to load Supabase client:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    
    root.render(
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Erro Crítico</h1>
          <p className="text-gray-700 mb-4">Falha ao carregar cliente Supabase:</p>
          <pre className="text-sm text-red-500 bg-red-50 p-2 rounded">
            {error.message}
          </pre>
        </div>
      </div>
    );
  });
}

console.log('🔍 Main.tsx execution completed');