import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'
import { emergencyDebugger } from '@/utils/emergencyDebugger'
import { superLogger } from '@/utils/superDebugLogger'

// 🚨 SUPER DEBUGGING MODE - MÁXIMO DETALHAMENTO
superLogger.log('MAIN_INIT', 'START', 'Iniciando sistema com super debug');

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
  
  superLogger.log('EMERGENCY_TOOLS', 'SUCCESS', 'Emergency tools available');
}

// Create QueryClient with default options
superLogger.log('QUERY_CLIENT', 'START', 'Creating QueryClient');
let queryClient: QueryClient;
try {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes  
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
  superLogger.log('QUERY_CLIENT', 'SUCCESS', 'QueryClient created');
} catch (error) {
  superLogger.log('QUERY_CLIENT', 'ERROR', null, error);
  throw error;
}

// Simple initialization - catch any errors here
superLogger.log('DOM_CHECK', 'START', 'Finding root element');
const container = document.getElementById('root');
if (!container) {
  superLogger.log('DOM_CHECK', 'ERROR', 'Root element not found');
  throw new Error('Root element with id="root" not found in DOM');
}
superLogger.log('DOM_CHECK', 'SUCCESS', 'Root element found');

superLogger.log('REACT_ROOT', 'START', 'Creating React root');
let root: any;
try {
  root = createRoot(container);
  superLogger.log('REACT_ROOT', 'SUCCESS', 'React root created');
} catch (error) {
  superLogger.log('REACT_ROOT', 'ERROR', null, error);
  throw error;
}

// Check Supabase environment
superLogger.log('SUPABASE_ENV', 'START', 'Checking Supabase environment');
try {
  const envCheck = assertSupabaseEnv();
  if (!envCheck) {
    superLogger.log('SUPABASE_ENV', 'ERROR', 'Environment variables missing');
    root.render(<EnvErrorPage />);
  } else {
    superLogger.log('SUPABASE_ENV', 'SUCCESS', 'Environment OK');
    
    // Dynamic import to catch any import errors
    superLogger.log('SUPABASE_CLIENT', 'START', 'Loading Supabase client');
    import('@/integrations/supabase/client').then((supabaseModule) => {
      superLogger.log('SUPABASE_CLIENT', 'SUCCESS', 'Supabase client loaded');
      
      // Make available for debugging
      (window as any).supabase = supabaseModule.supabase;
      
      superLogger.log('APP_RENDER', 'START', 'Rendering React app');
      try {
        root.render(
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        );
        superLogger.log('APP_RENDER', 'SUCCESS', 'React app rendered');
        
        // Log final report after a delay
        setTimeout(() => {
          const report = superLogger.getReport();
          console.log('🎯 SUPER DEBUG REPORT:', report);
        }, 2000);
        
      } catch (error) {
        superLogger.log('APP_RENDER', 'ERROR', null, error);
        
        root.render(
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
              <h1 className="text-xl font-bold text-red-600 mb-4">❌ Erro na Renderização do App</h1>
              <pre className="text-sm text-red-500 bg-red-50 p-2 rounded mb-4">
                {error.message}
              </pre>
              <button 
                onClick={() => console.log('🎯 SUPER DEBUG REPORT:', superLogger.getReport())}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Ver Logs Completos
              </button>
            </div>
          </div>
        );
      }
      
    }).catch((error) => {
      superLogger.log('SUPABASE_CLIENT', 'ERROR', null, error);
      
      root.render(
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h1 className="text-xl font-bold text-red-600 mb-4">❌ Erro ao Carregar Supabase</h1>
            <pre className="text-sm text-red-500 bg-red-50 p-2 rounded mb-4">
              {error.message}
            </pre>
            <button 
              onClick={() => console.log('🎯 SUPER DEBUG REPORT:', superLogger.getReport())}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Ver Logs Completos
            </button>
          </div>
        </div>
      );
    });
  }
} catch (error) {
  superLogger.log('SUPABASE_ENV', 'ERROR', null, error);
  throw error;
}

superLogger.log('MAIN_COMPLETE', 'SUCCESS', 'Main.tsx execution completed');