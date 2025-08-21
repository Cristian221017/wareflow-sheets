import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { solicitarNF, confirmarNF, recusarNF } from "@/lib/nfApi";
import { toast } from "sonner";

export type NFStatus = "Armazenada" | "Ordem Solicitada" | "Solicitação Confirmada";

export function useNFs(status: NFStatus) {
  return useQuery({
    queryKey: ["nfs", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`
          *,
          cliente:clientes(razao_social, cnpj),
          requested_by_profile:profiles!notas_fiscais_requested_by_fkey(name),
          approved_by_profile:profiles!notas_fiscais_approved_by_fkey(name)
        `)
        .eq("status", status)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data ?? [];
    }
  });
}

export function useFluxoMutations() {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["nfs", "Armazenada"] });
    qc.invalidateQueries({ queryKey: ["nfs", "Ordem Solicitada"] });
    qc.invalidateQueries({ queryKey: ["nfs", "Solicitação Confirmada"] });
  };

  const solicitar = useMutation({
    mutationFn: solicitarNF,
    onSuccess: () => {
      toast.success("Carregamento solicitado com sucesso!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao solicitar: ${error.message}`);
    }
  });

  const confirmar = useMutation({
    mutationFn: confirmarNF,
    onSuccess: () => {
      toast.success("Carregamento confirmado!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao confirmar: ${error.message}`);
    }
  });

  const recusar = useMutation({
    mutationFn: recusarNF,
    onSuccess: () => {
      toast.success("Carregamento recusado!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(`Erro ao recusar: ${error.message}`);
    }
  });

  return { solicitar, confirmar, recusar };
}