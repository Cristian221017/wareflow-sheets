// Super Debug Logger - Captura TUDO
class SuperDebugLogger {
  private logs: Array<{timestamp: number, step: string, status: 'START' | 'SUCCESS' | 'ERROR', data?: any, error?: any}> = [];
  
  log(step: string, status: 'START' | 'SUCCESS' | 'ERROR', data?: any, error?: any) {
    const logEntry = {
      timestamp: Date.now(),
      step,
      status,
      data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    
    this.logs.push(logEntry);
    
    const emoji = status === 'START' ? '🔄' : status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${emoji} [${step}] ${status}`, data, error);
    
    // Guardar no window para acesso global
    (window as any).__superDebugLogs = this.logs;
  }
  
  getReport() {
    return {
      totalSteps: this.logs.length,
      lastError: this.logs.filter(l => l.status === 'ERROR').pop(),
      timeline: this.logs,
      summary: this.logs.reduce((acc, log) => {
        acc[log.step] = acc[log.step] || [];
        acc[log.step].push(log.status);
        return acc;
      }, {} as Record<string, string[]>)
    };
  }
  
  clear() {
    this.logs = [];
    (window as any).__superDebugLogs = [];
  }
}

export const superLogger = new SuperDebugLogger();

// Disponibilizar globalmente para debug
if (typeof window !== 'undefined') {
  (window as any).superLogger = superLogger;
  (window as any).getSuperLogs = () => superLogger.getReport();
}