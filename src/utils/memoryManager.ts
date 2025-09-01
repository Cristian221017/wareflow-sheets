// Gerenciador centralizado de recursos para evitar memory leaks
import React from 'react';
import { log, warn } from './logger';

class MemoryManager {
  private timers = new Set<NodeJS.Timeout>();
  private intervals = new Set<NodeJS.Timeout>();
  private subscriptions = new Set<() => void>();
  private observers = new Set<MutationObserver | ResizeObserver | IntersectionObserver>();
  
  // Wrapper seguro para setTimeout
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    
    this.timers.add(timer);
    return timer;
  }
  
  // Wrapper seguro para setInterval
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }
  
  // Cleanup manual de timer
  clearTimeout(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }
  
  // Cleanup manual de interval
  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }
  
  // Registrar subscription para cleanup automático
  addSubscription(cleanup: () => void): () => void {
    this.subscriptions.add(cleanup);
    
    // Retorna função que remove a subscription e executa cleanup
    return () => {
      this.subscriptions.delete(cleanup);
      cleanup();
    };
  }
  
  // Registrar observer para cleanup automático
  addObserver(observer: MutationObserver | ResizeObserver | IntersectionObserver): void {
    this.observers.add(observer);
  }
  
  // Cleanup completo de todos os recursos
  cleanupAll(): void {
    log('🧹 MemoryManager: Limpando todos os recursos');
    
    // Limpar timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Limpar intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    
    // Limpar subscriptions
    this.subscriptions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        warn('⚠️ Erro ao executar cleanup de subscription:', error);
      }
    });
    this.subscriptions.clear();
    
    // Limpar observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        warn('⚠️ Erro ao desconectar observer:', error);
      }
    });
    this.observers.clear();
    
    log('✅ MemoryManager: Cleanup completo realizado');
  }
  
  // Status atual dos recursos
  getStatus() {
    return {
      timers: this.timers.size,
      intervals: this.intervals.size,
      subscriptions: this.subscriptions.size,
      observers: this.observers.size
    };
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

// Hook React para cleanup automático no unmount
export function useMemoryCleanup() {
  const [cleanupFunctions] = React.useState<Set<() => void>>(new Set());
  
  const addCleanup = React.useCallback((cleanup: () => void) => {
    cleanupFunctions.add(cleanup);
    return () => cleanupFunctions.delete(cleanup);
  }, [cleanupFunctions]);
  
  React.useEffect(() => {
    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          warn('⚠️ Erro no cleanup de componente:', error);
        }
      });
      cleanupFunctions.clear();
    };
  }, [cleanupFunctions]);
  
  return { addCleanup };
}

// ID Generator seguro (substitui Math.random)
export class SecureIdGenerator {
  private static counter = 0;
  private static prefix = Date.now().toString(36);
  
  static generate(prefix?: string): string {
    this.counter = (this.counter + 1) % 1000000; // Reset após 1M
    const timestamp = Date.now().toString(36);
    
    // Usar crypto.getRandomValues quando disponível
    let random: string;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      random = array[0].toString(36);
    } else {
      // Fallback seguro usando timestamp + performance
      const perf = typeof performance !== 'undefined' ? performance.now() : 0;
      random = Math.floor(perf * this.counter + timestamp.length).toString(36);
    }
    
    const counter = this.counter.toString(36);
    return `${prefix || 'id'}_${timestamp}_${random}_${counter}`;
  }
  
  // Para compatibility com código existente
  static uuid(): string {
    return this.generate('uuid');
  }
}

// Cleanup global ao fechar página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanupAll();
  });
  
  // Cleanup em caso de erro não tratado
  window.addEventListener('error', () => {
    warn('⚠️ Erro global detectado, executando cleanup preventivo');
    memoryManager.cleanupAll();
  });
}

export default memoryManager;