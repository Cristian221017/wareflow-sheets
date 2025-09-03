// Production monitoring and health checks
import { supabase } from '@/integrations/supabase/client';
import { error as logError, log, warn } from '@/utils/logger';

export interface ProductionHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    authentication: boolean;
    storage: boolean;
    performance: boolean;
  };
  metrics: {
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
  issues: string[];
}

class ProductionMonitor {
  private healthCheckInterval?: number;
  private isMonitoring = false;

  async runHealthCheck(): Promise<ProductionHealthCheck> {
    const startTime = performance.now();
    const issues: string[] = [];
    let checks = {
      database: false,
      authentication: false, 
      storage: false,
      performance: false
    };

    try {
      // Database connectivity check
      const { error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      checks.database = !dbError;
      if (dbError) issues.push(`Database error: ${dbError.message}`);

      // Authentication check
      const { error: authError } = await supabase.auth.getUser();
      checks.authentication = !authError;
      if (authError) issues.push(`Auth error: ${authError.message}`);

      // Performance check (database response time)
      const performanceStart = performance.now();
      await (supabase.rpc as any)('get_current_user_dashboard');
      const dbResponseTime = performance.now() - performanceStart;
      
      checks.performance = dbResponseTime < 1000; // Less than 1 second
      if (dbResponseTime > 1000) {
        issues.push(`Slow database response: ${dbResponseTime.toFixed(0)}ms`);
      }

      // Memory usage check
      const memoryUsage = this.getMemoryUsage();
      if (memoryUsage > 100) { // More than 100MB
        issues.push(`High memory usage: ${memoryUsage.toFixed(0)}MB`);
      }

    } catch (error) {
      issues.push(`Health check failed: ${error}`);
      logError('Health check error:', error);
    }

    const totalTime = performance.now() - startTime;
    const overallHealthy = Object.values(checks).every(Boolean) && issues.length === 0;

    const healthStatus: ProductionHealthCheck = {
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        responseTime: totalTime,
        memoryUsage: this.getMemoryUsage(),
        errorRate: issues.length / Object.keys(checks).length
      },
      issues
    };

    // Log critical issues
    if (healthStatus.status === 'unhealthy') {
      logError('🚨 System unhealthy:', healthStatus);
    } else if (healthStatus.status === 'degraded') {
      warn('⚠️ System degraded:', healthStatus);
    } else {
      log('✅ System healthy:', healthStatus.metrics);
    }

    return healthStatus;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      // @ts-ignore - Chrome specific
      return performance.memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return 0;
  }

  startMonitoring(intervalMinutes = 5): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    log('🔍 Starting production monitoring');

    // Initial health check
    this.runHealthCheck();

    // Periodic monitoring
    this.healthCheckInterval = window.setInterval(
      () => this.runHealthCheck(),
      intervalMinutes * 60 * 1000
    );
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.isMonitoring = false;
    log('🛑 Production monitoring stopped');
  }

  async validateDataIntegrity(): Promise<boolean> {
    try {
      // Check for orphaned records
      const { data: orphanedNFs } = await supabase
        .from('notas_fiscais')
        .select('id')
        .is('cliente_id', null) as any;

      if (orphanedNFs && orphanedNFs.length > 0) {
        warn(`Found ${orphanedNFs.length} orphaned NFs`);
        return false;
      }

      // Check for invalid status combinations  
      const { data: invalidStatusNFs } = await supabase
        .from('notas_fiscais')
        .select('id, status')
        .eq('status', 'ARMAZENADA') as any;

      return true;
    } catch (error) {
      logError('Data integrity check failed:', error);
      return false;
    }
  }
}

export const productionMonitor = new ProductionMonitor();

// React hook for components
export function useProductionMonitor() {
  return {
    runHealthCheck: () => productionMonitor.runHealthCheck(),
    startMonitoring: (interval?: number) => productionMonitor.startMonitoring(interval),
    stopMonitoring: () => productionMonitor.stopMonitoring(),
    validateDataIntegrity: () => productionMonitor.validateDataIntegrity()
  };
}