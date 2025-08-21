import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";
import { logFlow } from "@/types/nf";

/**
 * Configuração de Realtime para NFs
 * Garante que UI seja atualizada automaticamente sem F5
 */

export function subscribeNfChanges(queryClient: QueryClient): () => void {
  logFlow('subscribeNfChanges - iniciando', 'realtime');
  
  const channel = supabase
    .channel("nfs-realtime-changes")
    .on(
      "postgres_changes", 
      { 
        event: "*", 
        schema: "public", 
        table: "notas_fiscais" 
      }, 
      (payload) => {
        logFlow('postgres_changes recebido', (payload.new as any)?.id || (payload.old as any)?.id || 'unknown', undefined, `Evento: ${payload.eventType}`);
        
        // Invalidar todas as queries de NF para garantir dados atuais
        queryClient.invalidateQueries({ queryKey: ["nfs", "ARMAZENADA"] });
        queryClient.invalidateQueries({ queryKey: ["nfs", "SOLICITADA"] });
        queryClient.invalidateQueries({ queryKey: ["nfs", "CONFIRMADA"] });
        
        // Log detalhado do evento
        if (payload.eventType === 'UPDATE' && payload.old && payload.new) {
          const oldStatus = (payload.old as any).status;
          const newStatus = (payload.new as any).status;
          if (oldStatus !== newStatus) {
            logFlow(
              `Status change detected: ${oldStatus} → ${newStatus}`, 
              (payload.new as any).id, 
              newStatus
            );
          }
        }
      }
    )
    .subscribe((status) => {
      logFlow('Channel subscription status', 'realtime', undefined, status);
    });

  // Retornar função de cleanup
  return () => {
    logFlow('subscribeNfChanges - cleanup', 'realtime');
    supabase.removeChannel(channel);
  };
}