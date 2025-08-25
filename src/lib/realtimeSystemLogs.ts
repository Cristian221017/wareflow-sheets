import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

export function subscribeSystemLogs(queryClient: QueryClient) {
  const channel = supabase
    .channel("system-logs-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "system_logs"
      },
      (payload) => {
        console.log("Sistema de logs - Nova alteração:", payload);
        
        // Invalidar queries para recarregar dados
        queryClient.invalidateQueries({ queryKey: ["system_logs"] });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}