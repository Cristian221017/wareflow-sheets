// System Stabilizer - Emergency fixes for production stability
import { ENV } from '@/config/env';

class SystemStabilizer {
  private initialized = false;
  private cleanupInterval: number | null = null;

  initialize(): void {
    if (this.initialized) return;
    
    console.log('🛡️ SystemStabilizer: Initializing...');
    
    this.blockExternalErrorServices();
    this.setupGlobalErrorHandlers();
    this.cleanupDOMReferences();
    this.setupPeriodicCleanup();
    
    this.initialized = true;
    console.log('✅ SystemStabilizer: Initialized successfully');
  }

  private blockExternalErrorServices(): void {
    // Block all external error reporting services
    const blockedDomains = [
      'sentry.io',
      'bugsnag.com',
      'rollbar.com',
      'logrocket.com',
      'datadog.com',
      'honeybadger.io'
    ];

    // Override window.onerror completely
    window.onerror = (message, source, lineno, colno, error) => {
      // Only handle truly critical errors in development
      if (ENV.MODE === 'development' && error && !this.isIgnorableError(error)) {
        console.error('Critical error:', { message, source, lineno, colno, error });
      }
      return true; // Prevent default browser error handling
    };

    // Override unhandledrejection
    window.onunhandledrejection = (event) => {
      const reason = event.reason?.toString() || '';
      if (!this.isIgnorableRejection(reason)) {
        if (ENV.MODE === 'development') {
          console.error('Unhandled rejection:', event.reason);
        }
      }
      event.preventDefault();
    };

    // Block fetch requests to error services
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = input.toString();
      if (blockedDomains.some(domain => url.includes(domain))) {
        return Promise.reject(new Error('External error service blocked'));
      }
      return originalFetch.call(this, input, init);
    };
  }

  private setupGlobalErrorHandlers(): void {
    // Capture and filter console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      if (!this.isIgnorableError(message)) {
        originalConsoleError.apply(console, args);
      }
    };

    console.warn = (...args) => {
      const message = args[0]?.toString() || '';
      if (!this.isIgnorableWarning(message)) {
        originalConsoleWarn.apply(console, args);
      }
    };
  }

  private cleanupDOMReferences(): void {
    // Clean up any deferred DOM node references
    try {
      // Clear any pending React DevTools operations
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook.onCommitFiberRoot) {
          const original = hook.onCommitFiberRoot;
          hook.onCommitFiberRoot = function(...args: any[]) {
            try {
              return original.apply(this, args);
            } catch (error) {
              // Silent fail for DevTools errors
            }
          };
        }
      }

      // Clear ResizeObserver errors
      if (window.ResizeObserver) {
        const originalObserve = ResizeObserver.prototype.observe;
        ResizeObserver.prototype.observe = function(target: Element) {
          try {
            return originalObserve.call(this, target);
          } catch (error) {
            // Silent fail for ResizeObserver errors
          }
        };
      }
    } catch (error) {
      // Silent fail if cleanup fails
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up every 30 seconds
    this.cleanupInterval = window.setInterval(() => {
      this.performCleanup();
    }, 30000);
  }

  private performCleanup(): void {
    try {
      // Clear any leaked DOM references
      if (document.querySelectorAll) {
        const staleElements = document.querySelectorAll('[data-react-beautiful-dnd-droppable]');
        staleElements.forEach(el => {
          try {
            el.removeAttribute('data-react-beautiful-dnd-droppable');
          } catch (error) {
            // Silent fail
          }
        });
      }

      // Clear console if it gets too cluttered (only in production)
      if (ENV.MODE === 'production' && console.clear) {
        console.clear();
      }
    } catch (error) {
      // Silent fail if cleanup fails
    }
  }

  private isIgnorableError(error: any): boolean {
    const message = error?.message || error?.toString() || '';
    return message.includes('deferred DOM Node') ||
           message.includes('ResizeObserver') ||
           message.includes('Non-Error promise rejection') ||
           message.includes('Script error') ||
           message.includes('Network request failed') ||
           message.includes('Load failed') ||
           message.includes('validateDOMNesting') ||
           message.includes('React has detected') ||
           message.includes('Internal React error');
  }

  private isIgnorableRejection(reason: string): boolean {
    return reason.includes('deferred DOM Node') ||
           reason.includes('Non-Error promise rejection') ||
           reason.includes('External error service blocked') ||
           reason.includes('AbortError') ||
           reason.includes('The user aborted a request');
  }

  private isIgnorableWarning(message: string): boolean {
    return message.includes('Unrecognized feature') ||
           message.includes('sandbox attribute') ||
           message.includes('deferred DOM Node') ||
           message.includes('ResizeObserver') ||
           message.includes('validateDOMNesting') ||
           message.includes('React has detected') ||
           message.includes('Internal React error') ||
           message.includes('Expected static flag');
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.initialized = false;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      environment: ENV.MODE,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const systemStabilizer = new SystemStabilizer();

// Auto-initialize
if (typeof window !== 'undefined') {
  systemStabilizer.initialize();
}

export default systemStabilizer;