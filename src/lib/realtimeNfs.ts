import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

const NF_CHANNEL_NAME = "nfs-realtime";
const NF_QUERY_KEY = "nfs";

// D) Guard para evitar múltiplas subscriptions
let activeChannel: RealtimeChannel | null = null;

export function subscribeNfChanges(queryClient: QueryClient): () => void {
  // Guard: se já existe uma subscription ativa, retorna cleanup vazio
  if (activeChannel) {
    console.log('🔒 Subscription NFs já ativa, ignorando nova tentativa');
    return () => {}; 
  }

  console.log('🔄 Iniciando subscription realtime para NFs');
  
  const channel: RealtimeChannel = supabase
    .channel(NF_CHANNEL_NAME)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "notas_fiscais" 
      },
      (payload) => {
        console.log('📡 Mudança detectada na tabela notas_fiscais:', payload);
        
        // Invalidar todos os caches de NFs
        const statuses = ["ARMAZENADA", "SOLICITADA", "CONFIRMADA"];
        statuses.forEach(status => {
          queryClient.invalidateQueries({ queryKey: [NF_QUERY_KEY, status] });
        });
        
        // Log detalhado para debug
        if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const oldStatus = (payload.old as any).status;
          const newStatus = (payload.new as any).status;
          if (oldStatus !== newStatus) {
            console.log(`🔄 Status mudou: ${oldStatus} → ${newStatus} (NF: ${(payload.new as any).numero_nf})`);
          }
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Status da subscription:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscription realtime ativa para NFs');
        activeChannel = channel;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro na subscription realtime para NFs');
        activeChannel = null;
      }
    });

  // Retorna função de cleanup
  return () => {
    console.log('🔌 Desconectando subscription realtime para NFs');
    supabase.removeChannel(channel);
    activeChannel = null;
  };
}

// Hook para usar em componentes React
export function useRealtimeNFs(queryClient: QueryClient) {
  console.log('🔗 Configurando realtime NFs no componente');
  
  const cleanup = subscribeNfChanges(queryClient);
  
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