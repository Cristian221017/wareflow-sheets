// Emergency debugger to restore console and diagnose issues
class EmergencyDebugger {
  private originalConsole: any = {};
  private isActive = false;

  restoreConsole(): void {
    // Restore original console methods from window._debugConsole if available
    if ((window as any)._debugConsole) {
      this.originalConsole = (window as any)._debugConsole;
      console.log = this.originalConsole.log;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      console.info = this.originalConsole.info;
      console.debug = this.originalConsole.debug;
      this.isActive = true;
      console.log('🚨 EMERGENCY DEBUGGER ACTIVATED - Console restored');
      this.performSystemCheck();
    } else {
      console.log('❌ Could not restore original console methods');
    }
  }

  performSystemCheck(): void {
    console.log('🔍 EMERGENCY SYSTEM CHECK');
    console.log('=====================================');
    
    // Check if React is loaded
    console.log('React loaded:', typeof (window as any).React !== 'undefined');
    
    // Check if main elements exist
    console.log('Root element exists:', !!document.getElementById('root'));
    
    // Check if there are any thrown errors
    const errors = this.captureErrors();
    console.log('Captured errors:', errors.length);
    
    // Check network connectivity
    console.log('Online:', navigator.onLine);
    
    // Check if Supabase client is available
    console.log('Supabase available:', !!(window as any).supabase);
    
    // Check current URL
    console.log('Current URL:', window.location.href);
    
    console.log('=====================================');
  }

  captureErrors(): any[] {
    const errors: any[] = [];
    
    // Override error handlers temporarily to capture
    const originalError = window.onerror;
    window.onerror = (msg, file, line, col, error) => {
      errors.push({ msg, file, line, col, error });
      return originalError ? originalError(msg, file, line, col, error) : false;
    };
    
    return errors;
  }

  deactivate(): void {
    if (this.isActive) {
      console.log('🛑 Emergency debugger deactivated');
      this.isActive = false;
    }
  }

  getStatus(): any {
    return {
      active: this.isActive,
      consoleRestored: !!this.originalConsole.log,
      timestamp: new Date().toISOString()
    };
  }
}

export const emergencyDebugger = new EmergencyDebugger();

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).emergencyDebugger = emergencyDebugger;
  (window as any).restoreConsole = () => emergencyDebugger.restoreConsole();
}

export default emergencyDebugger;