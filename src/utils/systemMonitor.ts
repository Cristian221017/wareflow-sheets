// Sistema completo de monitoramento e health check
import { supabase } from "@/integrations/supabase/client";
import { log, warn, error as logError } from './logger';

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  performance: PerformanceMetrics;
  errors: SystemError[];
  lastCheck: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration: number;
  timestamp: string;
}

export interface PerformanceMetrics {
  authLoadTime: number;
  dbConnectionTime: number;
  memoryUsage: number;
  networkLatency: number;
}

export interface SystemError {
  id: string;
  type: 'auth' | 'database' | 'network' | 'ui' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  timestamp: string;
  resolved: boolean;
}

class SystemMonitor {
  private errors: SystemError[] = [];
  private performanceMarks: Map<string, number> = new Map();
  private healthChecks: HealthCheck[] = [];

  // Inicia marcação de performance
  startTimer(name: string): void {
    this.performanceMarks.set(name, performance.now());
  }

  // Finaliza marcação e retorna duração
  endTimer(name: string): number {
    const start = this.performanceMarks.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.performanceMarks.delete(name);
    return duration;
  }

  // Adiciona erro ao sistema
  addError(error: Omit<SystemError, 'id' | 'timestamp' | 'resolved'>): void {
    const systemError: SystemError = {
      ...error,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.errors.unshift(systemError);
    
    // Manter apenas últimos 100 erros
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(0, 100);
    }

    // Log baseado na severidade
    switch (systemError.severity) {
      case 'critical':
        logError(`🚨 CRITICAL: ${systemError.message}`, systemError);
        break;
      case 'high':
        logError(`⚠️ HIGH: ${systemError.message}`, systemError);
        break;
      case 'medium':
        warn(`🔶 MEDIUM: ${systemError.message}`, systemError);
        break;
      case 'low':
        log(`ℹ️ LOW: ${systemError.message}`, systemError);
        break;
    }
  }

  // Resolve erro
  resolveError(errorId: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      log(`✅ Error resolved: ${error.message}`);
    }
  }

  // Health check completo do sistema
  async runHealthCheck(): Promise<SystemHealth> {
    log('🔍 Iniciando health check completo...');
    const checks: HealthCheck[] = [];
    
    // 1. Teste de Autenticação
    const authCheck = await this.checkAuth();
    checks.push(authCheck);

    // 2. Teste de Conectividade BD
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // 3. Teste de Performance
    const perfCheck = await this.checkPerformance();
    checks.push(perfCheck);

    // 4. Teste de Integridade de Dados
    const dataCheck = await this.checkDataIntegrity();
    checks.push(dataCheck);

    // 5. Teste de Memory Leaks
    const memoryCheck = this.checkMemoryUsage();
    checks.push(memoryCheck);

    // Calcular status geral
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warn').length;
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (failedChecks > 0) {
      overall = 'critical';
    } else if (warningChecks > 0) {
      overall = 'warning';
    }

    const performance = await this.getPerformanceMetrics();
    
    const health: SystemHealth = {
      overall,
      checks,
      performance,
      errors: this.errors.filter(e => !e.resolved).slice(0, 10), // Últimos 10 não resolvidos
      lastCheck: new Date().toISOString()
    };

    log(`✅ Health check concluído: ${overall}`, health);
    return health;
  }

  // Teste de autenticação
  private async checkAuth(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      const { data, error } = await supabase.auth.getUser();
      const duration = performance.now() - start;
      
      if (error) {
        return {
          name: 'Authentication',
          status: 'fail',
          message: `Auth error: ${error.message}`,
          duration,
          timestamp: new Date().toISOString()
        };
      }

      return {
        name: 'Authentication',
        status: data.user ? 'pass' : 'warn',
        message: data.user ? 'User authenticated' : 'No user session',
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      const duration = performance.now() - start;
      return {
        name: 'Authentication',
        status: 'fail',
        message: `Auth check failed: ${err}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Teste de conectividade do banco
  private async checkDatabase(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      const { error } = await supabase
        .from('transportadoras')
        .select('id')
        .limit(1);
        
      const duration = performance.now() - start;
      
      if (error) {
        return {
          name: 'Database Connection',
          status: 'fail',
          message: `DB error: ${error.message}`,
          duration,
          timestamp: new Date().toISOString()
        };
      }

      const status = duration > 2000 ? 'warn' : 'pass';
      const message = duration > 2000 ? `Slow DB response: ${duration}ms` : 'DB connection healthy';

      return {
        name: 'Database Connection',
        status,
        message,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      const duration = performance.now() - start;
      return {
        name: 'Database Connection',
        status: 'fail',
        message: `DB check failed: ${err}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Teste de performance
  private async checkPerformance(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      // Simular operação típica do sistema
      const promises = [
        supabase.from('notas_fiscais').select('count').limit(1),
        supabase.from('clientes').select('count').limit(1),
        supabase.from('transportadoras').select('count').limit(1)
      ];

      await Promise.all(promises);
      const duration = performance.now() - start;

      const status = duration > 5000 ? 'fail' : duration > 2000 ? 'warn' : 'pass';
      const message = `System response time: ${Math.round(duration)}ms`;

      return {
        name: 'Performance',
        status,
        message,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      const duration = performance.now() - start;
      return {
        name: 'Performance',
        status: 'fail',
        message: `Performance check failed: ${err}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Teste de integridade de dados
  private async checkDataIntegrity(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      // Verificar contagens básicas das tabelas principais
      const [nfCount, clienteCount, transportadoraCount] = await Promise.all([
        supabase.from('notas_fiscais').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('transportadoras').select('id', { count: 'exact', head: true })
      ]);

      const duration = performance.now() - start;

      if (nfCount.error || clienteCount.error || transportadoraCount.error) {
        return {
          name: 'Data Integrity',
          status: 'fail',
          message: `Data integrity check failed: ${nfCount.error?.message || clienteCount.error?.message || transportadoraCount.error?.message}`,
          duration,
          timestamp: new Date().toISOString()
        };
      }

      const totalRecords = (nfCount.count || 0) + (clienteCount.count || 0) + (transportadoraCount.count || 0);
      const message = `System has ${totalRecords} total records (NFs: ${nfCount.count || 0}, Clients: ${clienteCount.count || 0}, Carriers: ${transportadoraCount.count || 0})`;

      return {
        name: 'Data Integrity',
        status: 'pass',
        message,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      const duration = performance.now() - start;
      return {
        name: 'Data Integrity',
        status: 'fail',
        message: `Data integrity check failed: ${err}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Verificação de uso de memória
  private checkMemoryUsage(): HealthCheck {
    const start = performance.now();
    
    try {
      // Verificar se há memory info disponível
      const memory = (performance as any).memory;
      const duration = performance.now() - start;

      if (!memory) {
        return {
          name: 'Memory Usage',
          status: 'warn',
          message: 'Memory info not available',
          duration,
          timestamp: new Date().toISOString()
        };
      }

      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      const usagePercent = (usedMB / limitMB) * 100;
      const status = usagePercent > 80 ? 'fail' : usagePercent > 60 ? 'warn' : 'pass';
      const message = `Memory usage: ${usedMB}MB/${limitMB}MB (${Math.round(usagePercent)}%)`;

      return {
        name: 'Memory Usage',
        status,
        message,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      const duration = performance.now() - start;
      return {
        name: 'Memory Usage',
        status: 'fail',
        message: `Memory check failed: ${err}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Métricas de performance
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const authStart = performance.now();
    try {
      await supabase.auth.getUser();
    } catch (e) {
      // ignore
    }
    const authLoadTime = performance.now() - authStart;

    const dbStart = performance.now();
    try {
      await supabase.from('transportadoras').select('id').limit(1);
    } catch (e) {
      // ignore
    }
    const dbConnectionTime = performance.now() - dbStart;

    const memory = (performance as any).memory;
    const memoryUsage = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;

    return {
      authLoadTime: Math.round(authLoadTime),
      dbConnectionTime: Math.round(dbConnectionTime),
      memoryUsage,
      networkLatency: Math.round((authLoadTime + dbConnectionTime) / 2)
    };
  }

  // Getters para acesso aos dados
  getErrors(): SystemError[] {
    return this.errors;
  }

  getUnresolvedErrors(): SystemError[] {
    return this.errors.filter(e => !e.resolved);
  }

  getCriticalErrors(): SystemError[] {
    return this.errors.filter(e => !e.resolved && e.severity === 'critical');
  }

  // Limpeza de dados antigos
  cleanup(): void {
    // Limpar erros antigos (mais de 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    this.errors = this.errors.filter(e => e.timestamp > dayAgo);
    
    // Limpar marcações de performance pendentes
    this.performanceMarks.clear();
    
    log('🧹 System monitor cleanup completed');
  }
}

// Instância singleton
export const systemMonitor = new SystemMonitor();

// Hook de conveniência para React
export function useSystemMonitor() {
  return {
    runHealthCheck: () => systemMonitor.runHealthCheck(),
    addError: (error: Omit<SystemError, 'id' | 'timestamp' | 'resolved'>) => systemMonitor.addError(error),
    resolveError: (id: string) => systemMonitor.resolveError(id),
    getErrors: () => systemMonitor.getErrors(),
    getUnresolvedErrors: () => systemMonitor.getUnresolvedErrors(),
    getCriticalErrors: () => systemMonitor.getCriticalErrors(),
    startTimer: (name: string) => systemMonitor.startTimer(name),
    endTimer: (name: string) => systemMonitor.endTimer(name),
    cleanup: () => systemMonitor.cleanup()
  };
}

// Auto-cleanup a cada hora
setInterval(() => {
  systemMonitor.cleanup();
}, 60 * 60 * 1000);