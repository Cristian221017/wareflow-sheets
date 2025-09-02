// Logger otimizado para produção - substitui console.logs diretos
import { ENV } from '@/config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  component?: string;
}

class ProductionLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = ENV.MODE === 'development';
  
  // Configurações por nível
  private config = {
    debug: { console: this.isDevelopment, remote: false },
    info: { console: this.isDevelopment, remote: false },
    warn: { console: true, remote: true },
    error: { console: true, remote: true }
  };

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      component: this.extractComponent()
    };

    // Armazenar em buffer
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const config = this.config[level];

    // Console logging baseado na configuração
    if (config.console) {
      this.logToConsole(entry);
    }

    // Remote logging apenas para warn/error em produção
    if (config.remote && !this.isDevelopment) {
      this.logToRemote(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const { level, message, data, component } = entry;
    const prefix = component ? `[${component}]` : '';
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(`🔍 ${fullMessage}`, data);
        break;
      case 'info':
        console.info(`ℹ️ ${fullMessage}`, data);
        break;
      case 'warn':
        console.warn(`⚠️ ${fullMessage}`, data);
        break;
      case 'error':
        console.error(`❌ ${fullMessage}`, data);
        break;
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    // Em produção, enviar logs críticos para serviço remoto
    try {
      // Exemplo de integração com serviço de logs
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      // Falback - não fazer nada para não criar loop infinito
    }
  }

  private extractComponent(): string | undefined {
    if (!this.isDevelopment) return undefined;
    
    const stack = new Error().stack;
    if (!stack) return undefined;

    // Extrair nome do componente/arquivo da stack trace
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/at .* \(.*\/([^\/]+\.(tsx?|jsx?))/);
      if (match) {
        return match[1].replace(/\.(tsx?|jsx?)$/, '');
      }
    }
    return undefined;
  }

  // Métodos públicos
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  // Métodos especiais
  audit(action: string, entity: string, metadata?: unknown): void {
    this.info(`AUDIT: ${action} on ${entity}`, metadata);
  }

  auditError(action: string, entity: string, error: Error, metadata?: unknown): void {
    this.error(`AUDIT_ERROR: ${action} on ${entity}`, { 
      error: error.message, 
      stack: error.stack,
      metadata 
    });
  }

  // Performance logging
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Utilidades de desenvolvimento
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Métricas e monitoramento
  getLogStats() {
    const levels = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const recentLogs = this.logs.filter(
      log => Date.now() - log.timestamp < 60 * 60 * 1000 // última hora
    );

    return {
      totalLogs: this.logs.length,
      levelBreakdown: levels,
      recentLogsCount: recentLogs.length,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp
    };
  }

  // Exportar logs para debug
  exportLogs(level?: LogLevel): LogEntry[] {
    if (!this.isDevelopment) {
      this.warn('Log export only available in development');
      return [];
    }

    return level 
      ? this.logs.filter(log => log.level === level)
      : [...this.logs];
  }

  // Limpar logs antigos
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > oneHourAgo);
  }
}

// Singleton instance
const productionLogger = new ProductionLogger();

// Exports compatíveis com logger atual
export const log = productionLogger.info.bind(productionLogger);
export const warn = productionLogger.warn.bind(productionLogger);
export const error = productionLogger.error.bind(productionLogger);
export const audit = productionLogger.audit.bind(productionLogger);
export const auditError = productionLogger.auditError.bind(productionLogger);

// Exports adicionais
export const debug = productionLogger.debug.bind(productionLogger);
export const timeStart = productionLogger.time.bind(productionLogger);
export const timeEnd = productionLogger.timeEnd.bind(productionLogger);
export const logGroup = productionLogger.group.bind(productionLogger);
export const logGroupEnd = productionLogger.groupEnd.bind(productionLogger);

// Cleanup automático
if (typeof window !== 'undefined') {
  setInterval(() => productionLogger.cleanup(), 60 * 60 * 1000); // Cleanup a cada hora
}

export default productionLogger;