import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

export function subscribeNfChanges(qc: QueryClient) {
  const channel = supabase
    .channel("nfs-changes")
    .on(
      "postgres_changes", 
      { 
        event: "*", 
        schema: "public", 
        table: "notas_fiscais" 
      }, 
      (payload) => {
        console.log('NF change detected:', payload);
        // Invalidar todas as queries de NFs para atualizar as listas
        qc.invalidateQueries({ queryKey: ["nfs", "Armazenada"] });
        qc.invalidateQueries({ queryKey: ["nfs", "Ordem Solicitada"] });
        qc.invalidateQueries({ queryKey: ["nfs", "Solicitação Confirmada"] });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}