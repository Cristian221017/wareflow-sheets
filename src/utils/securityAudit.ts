// Security audit e fixes para problemas críticos do sistema
import { error, warn } from '@/utils/productionLogger';
import { SecureIdGenerator, memoryManager } from '@/utils/memoryManager';

// 1. Substituir todos Math.random() por SecureIdGenerator
export class SecurityAudit {
  private static violations: Array<{ type: string; location: string; severity: 'critical' | 'high' | 'medium' }> = [];

  // Detectar violações de segurança em runtime
  static auditMathRandom() {
    if (typeof window !== 'undefined') {
      const originalMathRandom = Math.random;
      Math.random = function() {
        const stack = new Error().stack;
        const location = stack?.split('\n')[2] || 'unknown';
        
        // Ignorar chamadas do próprio sistema e bibliotecas conhecidas
        if (SecurityAudit.shouldIgnoreLocation(location)) {
          return originalMathRandom.call(this);
        }
        
        SecurityAudit.violations.push({
          type: 'INSECURE_RANDOM',
          location,
          severity: 'high'
        });
        
        warn('🚨 Math.random() detectado! Use SecureIdGenerator.generate()', { location });
        return originalMathRandom.call(this);
      };
    }
  }

  // Verificar se devemos ignorar warnings de certas localizações
  private static shouldIgnoreLocation(location: string): boolean {
    const ignoredPatterns = [
      'SecureIdGenerator',
      'memoryManager',
      'react-query',
      'supabase',
      '@supabase',
      'node_modules',
      'webpack',
      'react-dom',
      'scheduler',
      'uuid'
    ];
    
    return ignoredPatterns.some(pattern => location.includes(pattern));
  }

  // Detectar console.logs em produção
  static auditConsoleUsage() {
    if (import.meta.env.MODE === 'production' && typeof window !== 'undefined') {
      const originalConsole = { ...console };
      
      ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
        (console as any)[method] = function(...args: any[]) {
          const stack = new Error().stack;
          const location = stack?.split('\n')[2] || 'unknown';
          
          SecurityAudit.violations.push({
            type: `CONSOLE_${method.toUpperCase()}_PRODUCTION`,
            location,
            severity: 'critical'
          });
          
          error(`🚨 console.${method}() em produção! Use productionLogger`, { 
            args: args.map(arg => typeof arg === 'string' ? arg.substring(0, 100) : typeof arg),
            location 
          });
          
          // Ainda permitir em emergências, mas loggar
          return (originalConsole as any)[method].apply(this, args);
        };
      });
    }
  }

  // Memory leak detection
  static auditMemoryLeaks() {
    if (typeof window !== 'undefined') {
      let timeoutCount = 0;
      let intervalCount = 0;

      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;
      const originalClearTimeout = window.clearTimeout;
      const originalClearInterval = window.clearInterval;

      // Override com proper typing
      (window as any).setTimeout = function(callback: TimerHandler, delay?: number, ...args: any[]): number {
        timeoutCount++;
        const stack = new Error().stack;
        
        if (timeoutCount > 50) {
          warn('🚨 Possível memory leak: muitos timeouts ativos', { 
            count: timeoutCount,
            stack: stack?.split('\n')[2]
          });
        }
        
        const id = originalSetTimeout.call(this, (...callbackArgs) => {
          timeoutCount--;
          if (typeof callback === 'function') {
            callback(...callbackArgs);
          } else {
            // Handle string callbacks (eval)
            eval(callback as string);
          }
        }, delay, ...args);
        
        return id;
      };

      (window as any).setInterval = function(callback: TimerHandler, delay?: number, ...args: any[]): number {
        intervalCount++;
        const stack = new Error().stack;
        
        if (intervalCount > 10) {
          warn('🚨 Possível memory leak: muitos intervals ativos', { 
            count: intervalCount,
            stack: stack?.split('\n')[2]
          });
        }
        
        return originalSetInterval.call(this, callback, delay, ...args);
      };

      (window as any).clearTimeout = function(id?: number): void {
        if (id) timeoutCount = Math.max(0, timeoutCount - 1);
        return originalClearTimeout.call(this, id);
      };

      (window as any).clearInterval = function(id?: number): void {
        if (id) intervalCount = Math.max(0, intervalCount - 1);
        return originalClearInterval.call(this, id);
      };

      // Report periódico usando memoryManager
      memoryManager.setInterval(() => {
        if (timeoutCount > 20 || intervalCount > 5) {
          error('🚨 Memory leak detectado', { timeoutCount, intervalCount });
        }
      }, 30000); // Check a cada 30s
    }
  }

  // Audit de queries lentas
  static auditSlowQueries() {
    // Monitor fetch calls para detectar queries lentas
    if (typeof window !== 'undefined' && window.fetch) {
      const originalFetch = window.fetch;
      
      window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
        const startTime = Date.now();
        const url = typeof input === 'string' ? input : input.toString();
        
        try {
          const response = await originalFetch.call(this, input, init);
          const duration = Date.now() - startTime;
          
          if (duration > 3000) { // 3 segundos
            warn('🐌 Query lenta detectada', { 
              url: url.substring(0, 100),
              duration: `${duration}ms`,
              status: response.status
            });
          }
          
          return response;
        } catch (fetchError) {
          const duration = Date.now() - startTime;
          error('❌ Fetch falhou', { 
            url: url.substring(0, 100),
            duration: `${duration}ms`,
            error: fetchError
          });
          throw fetchError;
        }
      };
    }
  }

  // Relatório de violações
  static getViolationsReport() {
    const critical = this.violations.filter(v => v.severity === 'critical');
    const high = this.violations.filter(v => v.severity === 'high');
    const medium = this.violations.filter(v => v.severity === 'medium');

    return {
      summary: {
        total: this.violations.length,
        critical: critical.length,
        high: high.length,
        medium: medium.length
      },
      violations: {
        critical,
        high,
        medium
      },
      recommendations: this.getRecommendations()
    };
  }

  private static getRecommendations() {
    return [
      'Substituir Math.random() por SecureIdGenerator.generate()',
      'Remover todos console.logs e usar productionLogger',
      'Implementar memoryManager para cleanup automático',
      'Adicionar Error Boundaries em componentes críticos',
      'Otimizar queries com React Query e invalidações específicas',
      'Implementar tipos seguros para queries Supabase'
    ];
  }

  // Cleanup automático
  static cleanup() {
    this.violations = [];
  }

  // Inicializar todas as auditorias
  static initialize() {
    if (import.meta.env.MODE === 'production') {
      this.auditConsoleUsage();
    }
    this.auditMathRandom();
    this.auditMemoryLeaks();
    this.auditSlowQueries();

    // Relatório periódico em desenvolvimento
    if (import.meta.env.MODE === 'development') {
      setInterval(() => {
        const report = this.getViolationsReport();
        if (report.summary.total > 0) {
          warn('📊 Security Audit Report', report);
        }
      }, 60000); // A cada minuto
    }
  }
}

// Auto-inicializar
if (typeof window !== 'undefined') {
  SecurityAudit.initialize();
}

export default SecurityAudit;