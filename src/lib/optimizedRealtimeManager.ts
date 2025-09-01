// Gerenciador otimizado de realtime com memory management e error handling
import { supabase } from "@/integrations/supabase/client";
import { log, warn, error } from "@/utils/optimizedLogger";
import { memoryManager, SecureIdGenerator } from "@/utils/memoryManager";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface OptimizedSubscriber {
  id: string;
  queryClient: QueryClient;
  createdAt: number;
  lastActivity: number;
}

interface ConnectionMetrics {
  totalConnections: number;
  failedConnections: number;
  averageLatency: number;
  lastReconnectTime?: number;
}

class OptimizedRealtimeManager {
  private activeChannel: RealtimeChannel | null = null;
  private subscribers = new Map<string, OptimizedSubscriber>();
  private readonly channelName = "wms-central-realtime-v2";
  
  // Connection management
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private readonly baseReconnectDelay = 2000;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  
  // Performance metrics
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    failedConnections: 0,
    averageLatency: 0
  };
  
  // Debouncing para evitar invalidações excessivas
  private invalidationTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly invalidationDelay = 500; // 500ms debounce

  subscribe(queryClient: QueryClient, subscriberId?: string): () => void {
    const id = subscriberId || SecureIdGenerator.generate('realtime');
    const now = Date.now();
    
    log(`🔗 [OptimizedRT] Registrando subscriber: ${id}`);
    
    // Registrar subscriber com timestamps
    this.subscribers.set(id, {
      id,
      queryClient,
      createdAt: now,
      lastActivity: now
    });

    // Criar channel se necessário
    this.ensureConnection();

    // Retorna função de cleanup com memory management
    return memoryManager.addSubscription(() => {
      log(`🔌 [OptimizedRT] Removendo subscriber: ${id}`);
      this.subscribers.delete(id);
      
      // Cleanup automático se não há mais subscribers
      if (this.subscribers.size === 0) {
        this.scheduleDisconnection();
      }
    });
  }

  private ensureConnection(): void {
    if (this.activeChannel && this.connectionState === 'connected') {
      return;
    }

    if (this.connectionState === 'connecting') {
      log('⏳ [OptimizedRT] Conexão já em andamento');
      return;
    }

    this.createOptimizedChannel();
  }

  private createOptimizedChannel(): void {
    this.connectionState = 'connecting';
    log(`🔄 [OptimizedRT] Criando channel otimizado: ${this.channelName}`);
    
    const startTime = Date.now();
    
    this.activeChannel = supabase
      .channel(this.channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notas_fiscais" },
        (payload) => this.handleDebouncedChange('nfs', payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos_financeiros" },
        (payload) => this.handleDebouncedChange('documentos', payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes_carregamento" },
        (payload) => this.handleDebouncedChange('solicitacoes', payload)
      )
      .subscribe((status, err) => {
        const latency = Date.now() - startTime;
        
        log(`📡 [OptimizedRT] Status: ${status} (${latency}ms)`);
        
        switch (status) {
          case 'SUBSCRIBED':
            this.connectionState = 'connected';
            this.reconnectAttempts = 0;
            this.metrics.totalConnections++;
            this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
            break;
            
          case 'CHANNEL_ERROR':
            this.connectionState = 'error';
            this.metrics.failedConnections++;
            error('❌ [OptimizedRT] Erro na subscription:', err);
            this.handleConnectionError();
            break;
            
          case 'CLOSED':
            this.connectionState = 'disconnected';
            this.activeChannel = null;
            log('📡 [OptimizedRT] Channel fechado');
            break;
        }
      });
  }

  // Debounce invalidations para evitar spam
  private handleDebouncedChange(type: string, payload: any): void {
    const key = `${type}_${payload.eventType}`;
    
    // Cancelar timeout anterior se existir
    const existingTimeout = this.invalidationTimeouts.get(key);
    if (existingTimeout) {
      memoryManager.clearTimeout(existingTimeout);
    }
    
    // Criar novo timeout
    const timeout = memoryManager.setTimeout(() => {
      this.handleOptimizedChange(type, payload);
      this.invalidationTimeouts.delete(key);
    }, this.invalidationDelay);
    
    this.invalidationTimeouts.set(key, timeout);
  }

  private handleOptimizedChange(type: string, payload: any): void {
    const now = Date.now();
    log(`📡 [OptimizedRT] Mudança em ${type}:`, payload.eventType, payload.new?.numero_nf || payload.new?.id);
    
    // Atualizar activity timestamp dos subscribers
    this.subscribers.forEach(subscriber => {
      subscriber.lastActivity = now;
      
      // Invalidação inteligente e específica
      this.invalidateQueriesForType(subscriber.queryClient, type, payload);
    });
  }

  private invalidateQueriesForType(queryClient: QueryClient, type: string, payload: any): void {
    switch (type) {
      case 'nfs':
        queryClient.invalidateQueries({
          predicate: (query) => {
            const [firstKey] = query.queryKey as string[];
            return firstKey === 'nfs' || firstKey === 'dashboard';
          }
        });
        break;
        
      case 'documentos':
        queryClient.invalidateQueries({
          predicate: (query) => {
            const [firstKey] = query.queryKey as string[];
            return firstKey === 'documentos_financeiros' || firstKey === 'financeiro';
          }
        });
        break;
        
      case 'solicitacoes':
        queryClient.invalidateQueries({
          predicate: (query) => {
            const [firstKey] = query.queryKey as string[];
            return firstKey === 'solicitacoes' || firstKey === 'dashboard';
          }
        });
        break;
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      error(`❌ [OptimizedRT] Máximo de tentativas atingido (${this.maxReconnectAttempts})`);
      this.connectionState = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    warn(`⚠️ [OptimizedRT] Reconectando em ${delay}ms (tentativa ${this.reconnectAttempts})`);
    
    memoryManager.setTimeout(() => {
      this.cleanup();
      if (this.subscribers.size > 0) {
        this.createOptimizedChannel();
      }
    }, delay);
  }

  // Desconexão agendada para economizar recursos
  private scheduleDisconnection(): void {
    memoryManager.setTimeout(() => {
      if (this.subscribers.size === 0) {
        log('🔌 [OptimizedRT] Desconectando por inatividade');
        this.cleanup();
      }
    }, 30000); // 30 segundos de grace period
  }

  private cleanup(): void {
    if (this.activeChannel) {
      log('🔌 [OptimizedRT] Limpando channel');
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
    
    // Limpar timeouts de invalidação
    this.invalidationTimeouts.forEach(timeout => {
      memoryManager.clearTimeout(timeout);
    });
    this.invalidationTimeouts.clear();
    
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
  }

  // Métodos de monitoramento
  getStatus() {
    return {
      connectionState: this.connectionState,
      subscriberCount: this.subscribers.size,
      reconnectAttempts: this.reconnectAttempts,
      metrics: this.metrics,
      subscribers: Array.from(this.subscribers.keys()),
      pendingInvalidations: this.invalidationTimeouts.size
    };
  }

  // Forçar reconexão (para debug/admin)
  forceReconnect(): void {
    log('🔄 [OptimizedRT] Forçando reconexão');
    this.cleanup();
    if (this.subscribers.size > 0) {
      this.createOptimizedChannel();
    }
  }

  // Cleanup global
  globalCleanup(): void {
    log('🧹 [OptimizedRT] Cleanup global');
    this.subscribers.clear();
    this.invalidationTimeouts.clear();
    this.cleanup();
  }
}

// Singleton instance
export const optimizedRealtimeManager = new OptimizedRealtimeManager();

// Hook React otimizado
export function useOptimizedRealtimeManager(
  queryClient: QueryClient, 
  subscriberId?: string
): () => void {
  const cleanup = optimizedRealtimeManager.subscribe(queryClient, subscriberId);
  
  // Cleanup automático global
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => optimizedRealtimeManager.globalCleanup();
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
  
  return cleanup;
}