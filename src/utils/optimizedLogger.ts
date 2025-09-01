// Logger otimizado com throttling para evitar spam de logs
import { supabase } from "@/integrations/supabase/client";
import { ENV } from '@/config/env';

interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  meta?: Record<string, any>;
  timestamp: number;
  count: number;
}

class OptimizedLogger {
  private isDevelopment = ENV.MODE === 'development';
  private logQueue = new Map<string, LogEntry>();
  private isFlushingLogs = false;
  private flushInterval = 30000; // 30 segundos
  private maxQueueSize = 20; // Máximo 20 logs únicos na fila
  
  constructor() {
    // Flush logs periodicamente
    if (typeof window !== 'undefined') {
      setInterval(() => this.flushLogs(), this.flushInterval);
      // Flush ao sair da página
      window.addEventListener('beforeunload', () => this.flushLogs());
    }
  }

  private createLogKey(level: string, message: string): string {
    // Agrupar logs similares
    const normalizedMessage = message.slice(0, 100); // Primeiros 100 chars
    return `${level}:${normalizedMessage}`;
  }

  private addToQueue(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, any>): void {
    const key = this.createLogKey(level, message);
    const existing = this.logQueue.get(key);
    
    if (existing) {
      // Incrementar contador ao invés de duplicar logs
      existing.count++;
      existing.timestamp = Date.now();
      if (meta) {
        existing.meta = { ...existing.meta, ...meta };
      }
    } else {
      this.logQueue.set(key, {
        level,
        message,
        meta,
        timestamp: Date.now(),
        count: 1
      });
    }

    // Se a fila está cheia, remover o mais antigo
    if (this.logQueue.size > this.maxQueueSize) {
      const oldestKey = Array.from(this.logQueue.keys())[0];
      this.logQueue.delete(oldestKey);
    }

    // Flush imediatamente apenas para ERRORs críticos
    if (level === 'ERROR' && !this.isFlushingLogs) {
      setTimeout(() => this.flushLogs(), 1000); // 1 segundo de delay
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.isFlushingLogs || this.logQueue.size === 0) {
      return;
    }

    this.isFlushingLogs = true;
    const logsToFlush = Array.from(this.logQueue.values());
    this.logQueue.clear();

    try {
      // Processar apenas alguns logs por vez para evitar rate limiting
      const batchSize = 5;
      for (let i = 0; i < logsToFlush.length; i += batchSize) {
        const batch = logsToFlush.slice(i, i + batchSize);
        await this.processBatch(batch);
        
        // Delay entre batches para evitar spam
        if (i + batchSize < logsToFlush.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      if (this.isDevelopment) {
        console.warn('Failed to flush logs:', error);
      }
    } finally {
      this.isFlushingLogs = false;
    }
  }

  private async processBatch(logs: LogEntry[]): Promise<void> {
    const promises = logs.map(async (entry) => {
      try {
        const finalMessage = entry.count > 1 
          ? `${entry.message} (${entry.count}x)`
          : entry.message;

        await supabase.rpc('log_system_event' as any, {
          p_entity_type: 'FRONTEND',
          p_action: 'LOG',
          p_status: entry.level,
          p_message: finalMessage.slice(0, 500), // Limite de caracteres
          p_meta: entry.meta || {}
        });
      } catch (error) {
        // Silent fail para evitar loops de erro
      }
    });

    await Promise.allSettled(promises);
  }

  // Métodos públicos simplificados
  info(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.info('ℹ️', message, meta);
    }
    // Só logar infos importantes, não tudo
    if (message.includes('ERROR') || message.includes('Auth')) {
      this.addToQueue('INFO', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.warn('⚠️', message, meta);
    }
    this.addToQueue('WARN', message, meta);
  }

  error(message: string, error?: Error | any, meta?: Record<string, any>): void {
    // Sempre mostrar erros no console
    console.error('❌', message, error, meta);
    
    const errorMeta = {
      ...meta,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack?.slice(0, 500) : undefined
      } : error
    };

    this.addToQueue('ERROR', message, errorMeta);
  }

  // Métodos de compatibilidade
  audit(action: string, entity: string, meta?: any): void {
    this.info(`${action} em ${entity}`, meta);
  }

  auditError(action: string, entity: string, error: any, meta?: any): void {
    this.error(`${action} em ${entity}`, error, meta);
  }

  // Utilitários para debug
  getQueueStats() {
    return {
      queueSize: this.logQueue.size,
      isFlushingLogs: this.isFlushingLogs,
      entries: Array.from(this.logQueue.values()).map(entry => ({
        level: entry.level,
        message: entry.message.slice(0, 50),
        count: entry.count,
        age: Date.now() - entry.timestamp
      }))
    };
  }

  // Forçar flush manual
  async forceFlush(): Promise<void> {
    await this.flushLogs();
  }
}

// Singleton
const optimizedLogger = new OptimizedLogger();

// Exports
export const log = optimizedLogger.info.bind(optimizedLogger);
export const warn = optimizedLogger.warn.bind(optimizedLogger);
export const error = optimizedLogger.error.bind(optimizedLogger);
export const audit = optimizedLogger.audit.bind(optimizedLogger);
export const auditError = optimizedLogger.auditError.bind(optimizedLogger);

export default optimizedLogger;