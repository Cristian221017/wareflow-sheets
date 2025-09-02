// Production-optimized logger with minimal overhead
import { ENV } from '@/config/env';

interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  meta?: Record<string, any>;
  timestamp: number;
}

class ProductionOptimizedLogger {
  private isDevelopment = ENV.MODE === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 10; // Minimal buffer
  private lastFlush = Date.now();
  private flushInterval = 60000; // 1 minute
  
  constructor() {
    // Only enable minimal logging in development
    if (this.isDevelopment) {
      setInterval(() => this.flushIfNeeded(), this.flushInterval);
    }
  }

  private flushIfNeeded(): void {
    const now = Date.now();
    if (this.logBuffer.length >= this.maxBufferSize || (now - this.lastFlush) > this.flushInterval) {
      this.logBuffer = []; // Simply clear buffer
      this.lastFlush = now;
    }
  }

  private addToBuffer(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, any>): void {
    // Only buffer critical errors in production
    if (!this.isDevelopment && level !== 'ERROR') {
      return;
    }

    this.logBuffer.push({
      level,
      message: message.slice(0, 200), // Limit message size
      meta: meta ? JSON.parse(JSON.stringify(meta).slice(0, 500)) : undefined, // Limit meta size
      timestamp: Date.now()
    });

    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest
    }
  }

  // Minimal logging methods
  info(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.info('ℹ️', message, meta);
    }
    // Only log auth-related info messages
    if (message.includes('Auth') || message.includes('Login') || message.includes('Simple')) {
      this.addToBuffer('INFO', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.warn('⚠️', message, meta);
    }
    this.addToBuffer('WARN', message, meta);
  }

  error(message: string, error?: Error | any, meta?: Record<string, any>): void {
    // Always show errors in console
    console.error('❌', message, error, meta);
    
    const errorMeta = {
      ...meta,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack?.slice(0, 300) : undefined
      } : error
    };

    this.addToBuffer('ERROR', message, errorMeta);
  }

  // Compatibility methods
  audit(action: string, entity: string, meta?: any): void {
    if (this.isDevelopment) {
      this.info(`${action} em ${entity}`, meta);
    }
  }

  auditError(action: string, entity: string, error: any, meta?: any): void {
    this.error(`${action} em ${entity}`, error, meta);
  }

  // Debug utility
  getBufferStats() {
    return {
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      isDevelopment: this.isDevelopment,
      entries: this.logBuffer.slice(-5) // Last 5 entries only
    };
  }
}

// Singleton
const productionLogger = new ProductionOptimizedLogger();

// Exports
export const log = productionLogger.info.bind(productionLogger);
export const warn = productionLogger.warn.bind(productionLogger);
export const error = productionLogger.error.bind(productionLogger);
export const audit = productionLogger.audit.bind(productionLogger);
export const auditError = productionLogger.auditError.bind(productionLogger);

export default productionLogger;