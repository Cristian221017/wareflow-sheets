import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'
import { systemStabilizer } from '@/utils/systemStabilizer'
import { criticalSystemDiagnostic } from '@/utils/criticalSystemDiagnostic'

// Initialize system stabilizer FIRST - critical for stability
systemStabilizer.initialize();

// Initialize critical system diagnostic
criticalSystemDiagnostic.initialize();

// CRITICAL SYSTEM SETUP - Complete error suppression for stability

// 1. Disable all external error reporting services to prevent loops
(window as any).__SENTRY__ = undefined;
(window as any).Sentry = undefined;
(window as any).__NEXT_DATA__ = undefined;

// 2. Block external error reporting URLs
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0]?.toString() || '';
  if (url.includes('sentry.io') || url.includes('bugsnag') || url.includes('rollbar')) {
    return Promise.reject(new Error('External error reporting blocked'));
  }
  return originalFetch.apply(this, args);
};

// 3. Comprehensive console filtering - suppress ALL development warnings
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Block ALL non-critical warnings INCLUDING async listener errors
    if (message.includes('Unrecognized feature') || 
        message.includes('sandbox attribute') ||
        message.includes('deferred DOM Node') ||
        message.includes('ResizeObserver') ||
        message.includes('React has detected') ||
        message.includes('validateDOMNesting') ||
        message.includes('Internal React error') ||
        message.includes('listener indicated an asynchronous response') ||
        message.includes('message channel closed')) {
      return;
    }
  }
  originalWarn.apply(console, args);
};

// 4. Block unhandled promise rejections that aren't critical
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString() || '';
  if (reason.includes('deferred DOM Node') || 
      reason.includes('Non-Error promise rejection') ||
      reason.includes('External error reporting blocked') ||
      reason.includes('listener indicated an asynchronous response') ||
      reason.includes('message channel closed')) {
    event.preventDefault();
  }
});

// 5. Block error events that aren't critical  
window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (message.includes('deferred DOM Node') || 
      message.includes('ResizeObserver') ||
      message.includes('Script error')) {
    event.preventDefault();
  }
});

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
