import { supabase } from "@/integrations/supabase/client";
import { log, warn } from "@/utils/logger";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CENTRAL_CHANNEL_NAME = "wms-central-realtime";

// D) Guard para evitar múltiplas subscriptions centralizadas
let activeCentralChannel: RealtimeChannel | null = null;

export function subscribeCentralizedChanges(queryClient: QueryClient): () => void {
  // Guard: se já existe uma subscription ativa, retorna cleanup vazio
  if (activeCentralChannel) {
    log('🔒 Subscription centralizada já ativa, ignorando nova tentativa');
    return () => {}; 
  }
  log('🔄 Iniciando subscription realtime centralizada');
  
  const channel: RealtimeChannel = supabase
    .channel(CENTRAL_CHANNEL_NAME)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "notas_fiscais" 
      },
      (payload) => {
        log('📡 Mudança detectada em notas_fiscais:', payload);
        handleNFChange(payload, queryClient);
      }
    )
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "documentos_financeiros" 
      },
      (payload) => {
        log('📡 Mudança detectada em documentos_financeiros:', payload);
        handleDocumentoChange(payload, queryClient);
      }
    )
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "event_log" 
      },
      (payload) => {
        log('📡 Mudança detectada em event_log:', payload);
        handleEventLogChange(payload, queryClient);
      }
    )
    .subscribe((status) => {
      log('📡 Status da subscription centralizada:', status);
      if (status === 'SUBSCRIBED') {
        log('✅ Subscription realtime centralizada ativa');
        activeCentralChannel = channel;
      } else if (status === 'CHANNEL_ERROR') {
        warn('❌ Erro na subscription realtime centralizada');
        activeCentralChannel = null;
      }
    });

  // Retorna função de cleanup
  return () => {
    log('🔌 Desconectando subscription realtime centralizada');
    supabase.removeChannel(channel);
    activeCentralChannel = null;
  };
}

function handleNFChange(payload: any, queryClient: QueryClient) {
  // 🎯 Invalidação por PREDICATE - cobre TODAS as variações de chave NF
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [firstKey] = query.queryKey;
      return firstKey === 'nfs' || firstKey === 'solicitacoes';
    }
  });
  
  // Dashboard sempre
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  // Log detalhado para debug
  if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
    const oldStatus = payload.old.status;
    const newStatus = payload.new.status;
    if (oldStatus !== newStatus) {
      log(`🔄 Status da NF mudou: ${oldStatus} → ${newStatus} (NF: ${payload.new.numero_nf})`);
    }
  }
}

function handleDocumentoChange(payload: any, queryClient: QueryClient) {
  // 🎯 Invalidação por PREDICATE - cobre TODAS as variações de chave financeiro
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [firstKey] = query.queryKey;
      return firstKey === 'documentos_financeiros' || firstKey === 'financeiro';
    }
  });
  
  // Dashboard sempre
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  log('💰 Documento financeiro atualizado em tempo real');
}

function handleEventLogChange(payload: any, queryClient: QueryClient) {
  // 🎯 Invalidação por PREDICATE - cobre logs e eventos
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [firstKey, secondKey] = query.queryKey;
      return (firstKey === 'realtime' && secondKey === 'events') ||
             firstKey === 'event-logs' || 
             firstKey === 'system-logs';
    }
  });
  
  // Dashboard sempre
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  log('📝 Novo evento registrado no log');
}

// Hook para usar em componentes React
export function useCentralizedRealtime(queryClient: QueryClient) {
  log('🔗 Configurando realtime centralizada no componente');
  
  const cleanup = subscribeCentralizedChanges(queryClient);
  
  // Cleanup automático quando o componente desmontar
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    };
  }
  
  return cleanup;
}