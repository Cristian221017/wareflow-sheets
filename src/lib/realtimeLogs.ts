import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

const LOGS_CHANNEL_NAME = "event-logs-realtime";

// Guard para evitar múltiplas subscriptions
let activeLogsChannel: RealtimeChannel | null = null;

export function subscribeEventLogs(queryClient: QueryClient): () => void {
  // Guard: se já existe uma subscription ativa, retorna cleanup vazio
  if (activeLogsChannel) {
    console.log('🔒 Subscription de logs já ativa, ignorando nova tentativa');
    return () => {}; 
  }

  console.log('🔄 Iniciando subscription realtime para event logs');
  
  const channel: RealtimeChannel = supabase
    .channel(LOGS_CHANNEL_NAME)
    .on(
      "postgres_changes",
      { 
        event: "INSERT", 
        schema: "public", 
        table: "event_log" 
      },
      (payload) => {
        console.log('📡 Novo evento de log detectado:', payload);
        
        // Invalidar queries de logs
        queryClient.invalidateQueries({ queryKey: ["event-logs"] });
        queryClient.invalidateQueries({ queryKey: ["system-logs"] });
        
        // Log detalhado para debug
        if (payload.new) {
          const event = payload.new as any;
          console.log(`📝 Novo log: ${event.entity_type}/${event.event_type} por ${event.actor_role}`);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Status da subscription de logs:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscription realtime de logs ativa');
        activeLogsChannel = channel;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro na subscription realtime de logs');
        activeLogsChannel = null;
      }
    });

  // Retorna função de cleanup
  return () => {
    console.log('🔌 Desconectando subscription realtime de logs');
    supabase.removeChannel(channel);
    activeLogsChannel = null;
  };
}

// Hook para usar em componentes React
export function useRealtimeLogs(queryClient: QueryClient) {
  console.log('🔗 Configurando realtime de logs no componente');
  
  const cleanup = subscribeEventLogs(queryClient);
  
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