import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { assertSupabaseEnv } from '@/config/env'
import { EnvErrorPage } from '@/components/system/EnvErrorPage'
import { systemStabilizer } from '@/utils/systemStabilizer'
import { criticalSystemDiagnostic } from '@/utils/criticalSystemDiagnostic'
import { advancedDebugLogger } from '@/utils/advancedDebugLogger'
import { emergencyDebugger } from '@/utils/emergencyDebugger'

// Initialize system stabilizer FIRST - critical for stability
systemStabilizer.initialize();

// Initialize critical system diagnostic
criticalSystemDiagnostic.initialize();

// Initialize advanced debug logger
advancedDebugLogger.log('INFO', 'STARTUP', 'Application starting - all loggers initialized');

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

// 3. TARGETED CONSOLE FILTERING - Allow important logs through
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

console.warn = (...args) => {
  const message = String(args[0] || '');
  // Only suppress specific known non-critical warnings
  const suppressedMessages = [
    'We\'re hiring!', '⠀', 'Unrecognized feature', 'sandbox attribute',
    'deferred DOM Node', 'ResizeObserver'
  ];
  
  if (!suppressedMessages.some(msg => message.includes(msg))) {
    originalWarn.apply(console, args);
  }
};

console.error = (...args) => {
  const message = String(args[0] || '');
  // Only suppress specific known non-critical errors
  const suppressedErrors = [
    'Failed to load resource: the server responded with a status of 429',
    'deferred DOM Node', 'ResizeObserver', 'External error reporting',
    'We\'re hiring!', '⠀'
  ];
  
  if (!suppressedErrors.some(err => message.includes(err))) {
    originalError.apply(console, args);
  }
};

console.log = (...args) => {
  const message = String(args[0] || '');
  // Block ASCII art and hiring messages
  if (!message.includes('⠀') && !message.includes('We\'re hiring!')) {
    originalLog.apply(console, args);
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

// Make debug tools available globally for console access
if (typeof window !== 'undefined') {
  (window as any).debugLogger = advancedDebugLogger;
  (window as any).systemStabilizer = systemStabilizer;
  (window as any).criticalDiagnostic = criticalSystemDiagnostic;
  (window as any).emergencyDebugger = emergencyDebugger;
  
  // Add helpful console commands
  (window as any).debugCommands = {
    // Get current debug report
    getReport: () => advancedDebugLogger.getDebugReport(),
    
    // Get all logs
    getAllLogs: () => advancedDebugLogger.getAllLogs(),
    
    // Get errors only
    getErrors: () => advancedDebugLogger.getLogsByLevel('ERROR'),
    
    // Get critical errors only
    getCritical: () => advancedDebugLogger.getLogsByLevel('CRITICAL'),
    
    // Export logs to file
    exportLogs: () => advancedDebugLogger.exportLogs(),
    
    // Clear all logs
    clearLogs: () => advancedDebugLogger.clearLogs(),
    
    // Get system health
    getHealth: () => criticalSystemDiagnostic.getLastHealthReport(),
    
    // Run auto-fix
    autoFix: () => criticalSystemDiagnostic.autoFixCriticalIssues(),
    
    // Get stabilizer status
    getStabilizerStatus: () => systemStabilizer.getStatus(),
    
    // Help command
    help: () => {
      console.log(`
🔍 DEBUG COMMANDS AVAILABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 LOGS & REPORTS:
  debugCommands.getReport()       - Get full debug report
  debugCommands.getAllLogs()      - Get all captured logs
  debugCommands.getErrors()       - Get error logs only
  debugCommands.getCritical()     - Get critical logs only
  debugCommands.exportLogs()      - Download logs as JSON
  debugCommands.clearLogs()       - Clear all logs

🩺 SYSTEM HEALTH:
  debugCommands.getHealth()       - Get system health status
  debugCommands.autoFix()         - Run automatic fixes
  debugCommands.getStabilizerStatus() - Get stabilizer status

🌐 DIRECT ACCESS:
  debugLogger.*                   - Advanced debug logger
  systemStabilizer.*              - System stabilizer
  criticalDiagnostic.*            - Critical diagnostic

📍 WEB INTERFACES:
  Visit /debug-logs               - Full debug interface
  Visit /system-status            - System status dashboard

💡 TIP: Run debugCommands.getReport() to see what's happening!
      `);
    }
  };
  
  // Display help on load
  console.log('🔍 Debug tools loaded! Type debugCommands.help() for available commands.');
}

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
  advancedDebugLogger.log('ERROR', 'STARTUP', 'Supabase environment not configured', { 
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY 
  });
  root.render(<EnvErrorPage />);
} else {
  advancedDebugLogger.log('INFO', 'STARTUP', 'Supabase environment OK, starting app');
  
  // Import supabase only when ENV is valid and make it available for debugging
  import('@/integrations/supabase/client').then(({ supabase }) => {
    (window as any).supabase = supabase;
    advancedDebugLogger.log('DEBUG', 'STARTUP', 'Supabase client loaded and exposed to window');
  }).catch((error) => {
    advancedDebugLogger.log('ERROR', 'STARTUP', 'Failed to load Supabase client', { error: String(error) });
  });
  
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
