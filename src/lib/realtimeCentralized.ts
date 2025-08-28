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
  // Invalidar queries relacionadas a NFs com escopo
  const statuses = ["ARMAZENADA", "SOLICITADA", "CONFIRMADA"];
  const userTypes = ['cliente', 'transportadora'];
  
  statuses.forEach(status => {
    // Invalidar queries antigas sem escopo
    queryClient.invalidateQueries({ queryKey: ["nfs", status] });
    
    // Invalidar queries com escopo por persona
    userTypes.forEach(type => {
      queryClient.invalidateQueries({ queryKey: ["nfs", status, type] });
    });
  });
  
  // Invalidar dashboard
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
  // Invalidar queries relacionadas a documentos financeiros
  queryClient.invalidateQueries({ queryKey: ["documentos-financeiros"] });
  queryClient.invalidateQueries({ queryKey: ["financeiro"] });
  
  // Invalidar dashboard
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  log('💰 Documento financeiro atualizado em tempo real');
}

function handleEventLogChange(payload: any, queryClient: QueryClient) {
  // Invalidar eventos em tempo real
  queryClient.invalidateQueries({ queryKey: ["realtime", "events"] });
  
  // Invalidar dashboard para refletir mudanças recentes
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