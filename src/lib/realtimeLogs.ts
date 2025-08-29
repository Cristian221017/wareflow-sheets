import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

const LOGS_CHANNEL_NAME = "event-logs-realtime";

// Guard para evitar múltiplas subscriptions
let activeLogsChannel: RealtimeChannel | null = null;

export function subscribeEventLogs(queryClient: QueryClient): () => void {
  // Guard: se já existe uma subscription ativa, retorna cleanup vazio
  if (activeLogsChannel) {
    return () => {}; 
  }
  
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
        // Invalidar queries de logs
        queryClient.invalidateQueries({ queryKey: ["event-logs"] });
        queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        activeLogsChannel = channel;
      } else if (status === 'CHANNEL_ERROR') {
        activeLogsChannel = null;
      }
    });

  // Retorna função de cleanup
  return () => {
    supabase.removeChannel(channel);
    activeLogsChannel = null;
  };
}

// Hook para usar em componentes React
export function useRealtimeLogs(queryClient: QueryClient) {
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