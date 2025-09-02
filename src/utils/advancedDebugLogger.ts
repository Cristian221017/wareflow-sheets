/**
 * Advanced Debug Logger - Captures everything happening in the system
 * for troubleshooting persistent issues
 */

import { ENV } from '@/config/env';

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  category: string;
  message: string;
  data?: any;
  stack?: string;
  userAgent?: string;
  url?: string;
}

interface SystemSnapshot {
  timestamp: string;
  reactState: any;
  consoleErrors: string[];
  networkErrors: string[];
  domState: any;
  authState: any;
  contextState: any;
}

class AdvancedDebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private capturedErrors: string[] = [];
  private capturedWarnings: string[] = [];
  private networkRequests: any[] = [];
  private systemSnapshots: SystemSnapshot[] = [];
  private isCapturing = true;

  constructor() {
    this.initializeCapture();
  }

  private initializeCapture() {
    console.log('🔍 AdvancedDebugLogger: Initializing complete system capture...');
    
    this.captureConsoleOutput();
    this.captureNetworkActivity();
    this.captureUnhandledErrors();
    this.captureReactErrors();
    this.captureAuthEvents();
    this.startPeriodicSnapshots();
    
    this.log('INFO', 'SYSTEM', 'Advanced Debug Logger initialized');
  }

  private captureConsoleOutput() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = (...args) => {
      if (this.isCapturing) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        this.capturedErrors.push(message);
        this.log('ERROR', 'CONSOLE', message, { args });
      }
      return originalError.apply(console, args);
    };

    console.warn = (...args) => {
      if (this.isCapturing) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        this.capturedWarnings.push(message);
        this.log('WARN', 'CONSOLE', message, { args });
      }
      return originalWarn.apply(console, args);
    };

    console.log = (...args) => {
      if (this.isCapturing) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        if (message.includes('🔍') || message.includes('DEBUG') || message.includes('ERROR')) {
          this.log('DEBUG', 'CONSOLE', message, { args });
        }
      }
      return originalLog.apply(console, args);
    };
  }

  private captureNetworkActivity() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0]?.toString() || 'unknown';
      
      try {
        const response = await originalFetch.apply(window, args);
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          this.log('ERROR', 'NETWORK', `Fetch failed: ${response.status} ${response.statusText}`, {
            url,
            status: response.status,
            statusText: response.statusText,
            duration
          });
        } else {
          this.log('DEBUG', 'NETWORK', `Fetch success: ${response.status}`, {
            url,
            status: response.status,
            duration
          });
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.log('ERROR', 'NETWORK', `Fetch error: ${error}`, {
          url,
          error: String(error),
          duration
        });
        throw error;
      }
    };
  }

  private captureUnhandledErrors() {
    window.addEventListener('error', (event) => {
      this.log('CRITICAL', 'UNHANDLED_ERROR', event.message || 'Unknown error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('CRITICAL', 'UNHANDLED_REJECTION', String(event.reason), {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  private captureReactErrors() {
    // Capture React DevTools hook if available
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      if (hook.onCommitFiberRoot) {
        const original = hook.onCommitFiberRoot;
        hook.onCommitFiberRoot = (id: any, root: any, ...args: any[]) => {
          try {
            this.log('DEBUG', 'REACT', 'Fiber root commit', { id, rootTag: root?.tag });
            return original.call(hook, id, root, ...args);
          } catch (error) {
            this.log('ERROR', 'REACT', 'Fiber root commit error', { error: String(error) });
            throw error;
          }
        };
      }
    }
  }

  private captureAuthEvents() {
    // Monitor localStorage/sessionStorage for auth changes
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key.includes('auth') || key.includes('supabase') || key.includes('token')) {
        advancedDebugLogger.log('DEBUG', 'AUTH', `Storage set: ${key}`, { 
          key, 
          valueLength: value.length,
          storage: this === localStorage ? 'localStorage' : 'sessionStorage'
        });
      }
      return originalSetItem.call(this, key, value);
    };
  }

  private startPeriodicSnapshots() {
    setInterval(() => {
      this.takeSystemSnapshot();
    }, 30000); // Every 30 seconds
  }

  private takeSystemSnapshot() {
    try {
      const snapshot: SystemSnapshot = {
        timestamp: new Date().toISOString(),
        reactState: this.getReactState(),
        consoleErrors: [...this.capturedErrors.slice(-10)],
        networkErrors: [...this.networkRequests.filter(req => req.error).slice(-5)],
        domState: this.getDOMState(),
        authState: this.getAuthState(),
        contextState: this.getContextState()
      };

      this.systemSnapshots.push(snapshot);
      if (this.systemSnapshots.length > 10) {
        this.systemSnapshots.shift(); // Keep only last 10 snapshots
      }

      this.log('DEBUG', 'SNAPSHOT', 'System snapshot taken', { 
        errorsCount: snapshot.consoleErrors.length,
        networkErrorsCount: snapshot.networkErrors.length
      });
    } catch (error) {
      this.log('ERROR', 'SNAPSHOT', 'Failed to take system snapshot', { error: String(error) });
    }
  }

  private getReactState() {
    try {
      const reactFiber = (document.getElementById('root') as any)?._reactInternalFiber 
                      || (document.getElementById('root') as any)?._reactInternals;
      
      if (reactFiber) {
        return {
          hasReactRoot: true,
          fiberNodeType: reactFiber.type?.name || 'unknown',
          stateNode: !!reactFiber.stateNode,
          child: !!reactFiber.child
        };
      }
      
      return { hasReactRoot: false };
    } catch (error) {
      return { error: String(error) };
    }
  }

  private getDOMState() {
    try {
      return {
        title: document.title,
        readyState: document.readyState,
        elementCount: document.querySelectorAll('*').length,
        scriptsCount: document.querySelectorAll('script').length,
        hasRoot: !!document.getElementById('root'),
        bodyChildren: document.body?.children.length || 0
      };
    } catch (error) {
      return { error: String(error) };
    }
  }

  private getAuthState() {
    try {
      const supabaseSession = localStorage.getItem('sb-supabase-auth-token') 
                           || sessionStorage.getItem('sb-supabase-auth-token');
      
      return {
        hasSupabaseSession: !!supabaseSession,
        localStorageKeys: Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('supabase')
        ),
        sessionStorageKeys: Object.keys(sessionStorage).filter(key => 
          key.includes('auth') || key.includes('supabase')
        )
      };
    } catch (error) {
      return { error: String(error) };
    }
  }

  private getContextState() {
    try {
      return {
        windowLocation: window.location.href,
        userAgent: navigator.userAgent,
        environment: ENV.MODE,
        timestamp: Date.now()
      };
    } catch (error) {
      return { error: String(error) };
    }
  }

  public log(level: LogEntry['level'], category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      stack: level === 'ERROR' || level === 'CRITICAL' ? new Error().stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logs.push(entry);
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Always output debug logs to actual console for visibility
    const prefix = `🔍 [${level}][${category}]`;
    switch (level) {
      case 'DEBUG':
        console.log(prefix, message, data || '');
        break;
      case 'INFO':
        console.info(prefix, message, data || '');
        break;
      case 'WARN':
        console.warn(prefix, message, data || '');
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(prefix, message, data || '');
        break;
    }
  }

  public getAllLogs() {
    return [...this.logs];
  }

  public getLogsByCategory(category: string) {
    return this.logs.filter(log => log.category === category);
  }

  public getLogsByLevel(level: LogEntry['level']) {
    return this.logs.filter(log => log.level === level);
  }

  public getSystemSnapshots() {
    return [...this.systemSnapshots];
  }

  public getDebugReport() {
    const now = new Date().toISOString();
    const errors = this.getLogsByLevel('ERROR');
    const criticals = this.getLogsByLevel('CRITICAL');
    const warnings = this.getLogsByLevel('WARN');
    
    return {
      timestamp: now,
      summary: {
        totalLogs: this.logs.length,
        errors: errors.length,
        criticals: criticals.length,
        warnings: warnings.length,
        snapshots: this.systemSnapshots.length
      },
      recentErrors: errors.slice(-10),
      recentCriticals: criticals.slice(-10),
      recentWarnings: warnings.slice(-10),
      latestSnapshot: this.systemSnapshots[this.systemSnapshots.length - 1],
      capturedConsoleErrors: this.capturedErrors.slice(-20),
      capturedWarnings: this.capturedWarnings.slice(-20)
    };
  }

  public exportLogs() {
    const report = this.getDebugReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public clearLogs() {
    this.logs = [];
    this.capturedErrors = [];
    this.capturedWarnings = [];
    this.systemSnapshots = [];
    this.log('INFO', 'SYSTEM', 'Debug logs cleared');
  }

  public pauseCapture() {
    this.isCapturing = false;
    this.log('INFO', 'SYSTEM', 'Debug capture paused');
  }

  public resumeCapture() {
    this.isCapturing = true;
    this.log('INFO', 'SYSTEM', 'Debug capture resumed');
  }
}

// Global singleton
export const advancedDebugLogger = new AdvancedDebugLogger();

// Make it available globally for manual debugging
if (typeof window !== 'undefined') {
  (window as any).debugLogger = advancedDebugLogger;
}

export default advancedDebugLogger;
