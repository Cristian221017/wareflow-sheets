import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { solicitarNF, confirmarNF, recusarNF } from "@/lib/nfApi";
import { toast } from "sonner";
import { NFStatus, NF, logFlow } from "@/types/nf";

export type { NFStatus } from "@/types/nf";

/**
 * Hook para buscar NFs por status
 * Implementa cache inteligente com React Query
 */
export function useNFs(status: NFStatus) {
  return useQuery({
    queryKey: ["nfs", status],
    queryFn: async (): Promise<NF[]> => {
      logFlow(`useNFs query - ${status}`, 'multiple');
      
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
        
      if (error) {
        logFlow(`useNFs query error - ${status}`, 'multiple', undefined, error.message);
        throw error;
      }
      
      logFlow(`useNFs query success - ${status}`, 'multiple', status, `${data?.length || 0} NFs encontradas`);
      return data as unknown as NF[] ?? [];
    },
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para mutations do fluxo de NF
 * Implementa invalidação automática e resistance a duplo clique
 */
export function useFluxoMutations() {
  const queryClient = useQueryClient();

  // Função para invalidar todas as queries de NF
  const invalidateAllNFs = () => {
    logFlow('invalidateAllNFs', 'all');
    queryClient.invalidateQueries({ queryKey: ["nfs", "ARMAZENADA"] });
    queryClient.invalidateQueries({ queryKey: ["nfs", "SOLICITADA"] });
    queryClient.invalidateQueries({ queryKey: ["nfs", "CONFIRMADA"] });
  };

  const solicitar = useMutation({
    mutationFn: solicitarNF,
    onMutate: async (nfId) => {
      logFlow('solicitar mutation - início', nfId);
      
      // Cancelar queries em andamento para evitar conflitos
      await queryClient.cancelQueries({ queryKey: ["nfs"] });
      
      // Otimistic update (opcional)
      // Aqui poderia implementar update otimista se necessário
    },
    onSuccess: (_, nfId) => {
      logFlow('solicitar mutation - sucesso', nfId);
      toast.success("Carregamento solicitado com sucesso!");
      invalidateAllNFs();
    },
    onError: (error: any, nfId) => {
      logFlow('solicitar mutation - erro', nfId, undefined, error.message);
      toast.error(`Erro ao solicitar: ${error.message}`);
    }
  });

  const confirmar = useMutation({
    mutationFn: confirmarNF,
    onMutate: async (nfId) => {
      logFlow('confirmar mutation - início', nfId);
      await queryClient.cancelQueries({ queryKey: ["nfs"] });
    },
    onSuccess: (_, nfId) => {
      logFlow('confirmar mutation - sucesso', nfId);
      toast.success("Carregamento confirmado!");
      invalidateAllNFs();
    },
    onError: (error: any, nfId) => {
      logFlow('confirmar mutation - erro', nfId, undefined, error.message);
      toast.error(`Erro ao confirmar: ${error.message}`);
    }
  });

  const recusar = useMutation({
    mutationFn: recusarNF,
    onMutate: async (nfId) => {
      logFlow('recusar mutation - início', nfId);
      await queryClient.cancelQueries({ queryKey: ["nfs"] });
    },
    onSuccess: (_, nfId) => {
      logFlow('recusar mutation - sucesso', nfId);
      toast.success("Carregamento recusado!");
      invalidateAllNFs();
    },
    onError: (error: any, nfId) => {
      logFlow('recusar mutation - erro', nfId, undefined, error.message);
      toast.error(`Erro ao recusar: ${error.message}`);
    }
  });

  return { 
    solicitar, 
    confirmar, 
    recusar,
    // Estado dos loadings para UI
    isLoading: solicitar.isPending || confirmar.isPending || recusar.isPending
  };
}