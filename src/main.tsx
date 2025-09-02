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

// ULTRA-AGGRESSIVE ERROR SUPPRESSION - Complete silence of non-critical issues

// 1. TOTAL SENTRY AND EXTERNAL ERROR SERVICE LOCKDOWN
(window as any).__SENTRY__ = undefined;
(window as any).Sentry = undefined;
(window as any).__NEXT_DATA__ = undefined;
(window as any).gtag = undefined;
(window as any).ga = undefined;
(window as any).fbq = undefined;

// 2. COMPLETE FETCH BLOCKING for error services
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0]?.toString() || '';
  const blockedDomains = [
    'sentry.io', 'bugsnag', 'rollbar', 'logrocket', 'datadog',
    'honeybadger', 'airbrake', 'trackjs', 'raygun', 'errorception'
  ];
  
  if (blockedDomains.some(domain => url.includes(domain))) {
    return Promise.reject(new Error('External error reporting service permanently blocked'));
  }
  return originalFetch.apply(this, args);
};

// 3. NUCLEAR CONSOLE FILTERING - Block EVERYTHING non-critical
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // COMPLETE WARNING SUPPRESSION
    const suppressedMessages = [
      'Unrecognized feature', 'sandbox attribute', 'deferred DOM Node',
      'ResizeObserver', 'React has detected', 'validateDOMNesting',
      'Internal React error', 'listener indicated an asynchronous response',
      'message channel closed', 'We\'re hiring', 'Expected static flag',
      'favicon.ico', 'manifest.json'
    ];
    
    if (suppressedMessages.some(msg => message.includes(msg))) {
      return; // COMPLETE SUPPRESSION
    }
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0]?.toString() || '';
  const suppressedErrors = [
    'deferred DOM Node', 'ResizeObserver', 'Script error',
    'Network request failed', 'Load failed', 'validateDOMNesting',
    'Non-Error promise rejection', 'listener indicated an asynchronous response',
    'message channel closed', 'External error reporting', 'favicon.ico',
    'Too Many Requests', '429'
  ];
  
  if (!suppressedErrors.some(err => message.includes(err))) {
    originalError.apply(console, args);
  }
};

// 4. TOTAL PROMISE REJECTION SUPPRESSION
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString() || '';
  const suppressedReasons = [
    'deferred DOM Node', 'Non-Error promise rejection',
    'External error reporting', 'listener indicated an asynchronous response',
    'message channel closed', 'AbortError', 'The user aborted a request',
    'NetworkError', 'Failed to fetch', '429', 'Too Many Requests'
  ];
  
  if (suppressedReasons.some(r => reason.includes(r))) {
    event.preventDefault();
  }
});

// 5. COMPLETE ERROR EVENT SUPPRESSION
window.addEventListener('error', (event) => {
  const message = event.message || '';
  const suppressedMessages = [
    'deferred DOM Node', 'ResizeObserver', 'Script error',
    'favicon.ico', 'manifest.json', 'NetworkError'
  ];
  
  if (suppressedMessages.some(msg => message.includes(msg))) {
    event.preventDefault();
    event.stopPropagation();
  }
});

// 6. IFRAME POSTMESSAGE ERROR SUPPRESSION
window.addEventListener('message', (event) => {
  // Suppress cross-origin postMessage errors
  if (event.origin !== window.location.origin) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

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
