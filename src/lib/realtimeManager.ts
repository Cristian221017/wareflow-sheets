// Gerenciador robusto de subscriptions realtime com cleanup adequado
import { supabase } from "@/integrations/supabase/client";
import { log, warn, error } from "@/utils/optimizedLogger";
import { SecureIdGenerator, memoryManager } from "@/utils/memoryManager";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Subscriber {
  id: string;
  queryClient: QueryClient;
  cleanup?: () => void;
}

class RealtimeManager {
  private activeChannel: RealtimeChannel | null = null;
  private subscribers = new Map<string, Subscriber>();
  private channelName = "wms-central-realtime";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  subscribe(id: string, queryClient: QueryClient): () => void {
    log(`🔗 Registrando subscriber: ${id}`);
    
    // Registrar subscriber
    this.subscribers.set(id, { id, queryClient });

    // Criar channel se não existir
    if (!this.activeChannel) {
      this.createChannel();
    }

    // Retorna função de cleanup específica
    return () => {
      log(`🔌 Removendo subscriber: ${id}`);
      this.subscribers.delete(id);
      
      // Se não há mais subscribers, limpar channel
      if (this.subscribers.size === 0) {
        this.cleanup();
      }
    };
  }

  private createChannel() {
    log(`🔄 Criando novo channel realtime: ${this.channelName}`);
    
    this.activeChannel = supabase
      .channel(this.channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notas_fiscais" },
        (payload) => this.handleNFChange(payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos_financeiros" },
        (payload) => this.handleDocumentoChange(payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_log" },
        (payload) => this.handleEventLogChange(payload)
      )
      .subscribe((status) => {
        log(`📡 Status da subscription: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          log('✅ Subscription realtime ativa');
          this.reconnectAttempts = 0; // Reset counter on success
        } else if (status === 'CHANNEL_ERROR') {
          warn('❌ Erro na subscription realtime');
          this.handleConnectionError();
        } else if (status === 'CLOSED') {
          log('📡 Channel fechado');
          this.activeChannel = null;
        }
      });
  }

  private handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      warn(`⚠️ Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);
      
      memoryManager.setTimeout(() => {
        this.cleanup();
        if (this.subscribers.size > 0) {
          this.createChannel();
        }
      }, delay);
    } else {
      error(`❌ Máximo de tentativas de reconexão atingido (${this.maxReconnectAttempts})`);
    }
  }

  private handleNFChange(payload: any) {
    log('📡 Mudança em notas_fiscais:', payload.eventType, payload.new?.numero_nf);
    
    this.subscribers.forEach(({ queryClient }) => {
      // Invalidação inteligente por predicate
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          const [firstKey] = query.queryKey;
          return firstKey === 'nfs' || firstKey === 'solicitacoes';
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    // Log detalhado para mudanças de status
    if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
      const oldStatus = payload.old.status;
      const newStatus = payload.new.status;
      if (oldStatus !== newStatus) {
        log(`🔄 Status NF mudou: ${oldStatus} → ${newStatus} (${payload.new.numero_nf})`);
      }
    }
  }

  private handleDocumentoChange(payload: any) {
    log('📡 Mudança em documentos_financeiros:', payload.eventType);
    
    this.subscribers.forEach(({ queryClient }) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          const [firstKey] = query.queryKey;
          return firstKey === 'documentos_financeiros' || firstKey === 'financeiro';
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
  }

  private handleEventLogChange(payload: any) {
    log('📡 Mudança em event_log:', payload.eventType);
    
    this.subscribers.forEach(({ queryClient }) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          const [firstKey, secondKey] = query.queryKey;
          return (firstKey === 'realtime' && secondKey === 'events') ||
                 firstKey === 'event-logs' || 
                 firstKey === 'system-logs';
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
  }

  private cleanup() {
    if (this.activeChannel) {
      log('🔌 Desconectando channel realtime');
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
      this.reconnectAttempts = 0;
    }
  }

  // Método para forçar reconexão
  forceReconnect() {
    log('🔄 Forçando reconexão do realtime...');
    this.cleanup();
    if (this.subscribers.size > 0) {
      this.createChannel();
    }
  }

  // Status do manager
  getStatus() {
    return {
      isConnected: this.activeChannel !== null,
      subscriberCount: this.subscribers.size,
      reconnectAttempts: this.reconnectAttempts,
      subscribers: Array.from(this.subscribers.keys())
    };
  }

  // Cleanup global - para usar no beforeunload
  globalCleanup() {
    log('🧹 Limpeza global do RealtimeManager');
    this.subscribers.clear();
    this.cleanup();
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();

// Hook para usar em componentes React
export function useRealtimeManager(queryClient: QueryClient, subscriberId?: string) {
  const id = subscriberId || SecureIdGenerator.generate('realtime');
  
  const cleanup = realtimeManager.subscribe(id, queryClient);
  
  // Cleanup automático quando o componente desmontar
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => realtimeManager.globalCleanup();
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
  
  return cleanup;
}