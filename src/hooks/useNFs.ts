import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitarNF, confirmarNF, recusarNF, fetchNFsByStatus, deleteNF } from "@/lib/nfApi";
import { toast } from "sonner";
import { log, audit, error } from "@/utils/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useInvalidateAll } from "./useInvalidateAll";
import { useAgendamentoUnificado } from "./useAgendamentoUnificado";
import type { NFStatus, NotaFiscal } from "@/types/nf";

const NF_QUERY_KEY = "nfs";

export function useNFs(status: NFStatus) {
  const { user } = useAuth();
  const scope = user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId;
  
  return useQuery({
    queryKey: ['nfs', status, user?.type, scope],
    queryFn: () => fetchNFsByStatus(status),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!user?.id && !!scope,
  });
}

export function useAllNFs() {
  const armazenadas = useNFs("ARMAZENADA");
  const solicitadas = useNFs("SOLICITADA");  
  const confirmadas = useNFs("CONFIRMADA");

  return {
    armazenadas: armazenadas.data || [],
    solicitadas: solicitadas.data || [],
    confirmadas: confirmadas.data || [],
    isLoading: armazenadas.isLoading || solicitadas.isLoading || confirmadas.isLoading,
    isError: armazenadas.isError || solicitadas.isError || confirmadas.isError,
    error: armazenadas.error || solicitadas.error || confirmadas.error,
  };
}

export function useFluxoMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { invalidateAll } = useInvalidateAll();
  const { solicitarCarregamentoComAgendamento } = useAgendamentoUnificado();
  
  const solicitar = {
    mutate: (data: { nfId: string; dataAgendamento?: string; observacoes?: string; documentos?: File[] }) => {
      solicitarCarregamentoComAgendamento.mutate(data);
    },
    mutateAsync: async (data: { nfId: string; dataAgendamento?: string; observacoes?: string; documentos?: File[] }) => {
      await solicitarCarregamentoComAgendamento.mutateAsync(data);
    },
    isPending: solicitarCarregamentoComAgendamento.isPending,
  };

  const confirmar = useMutation({
    mutationFn: confirmarNF,
    onSuccess: (_, nfId) => {
      audit('NF_CONFIRMADA', 'NF', { nfId });
      invalidateAll(); // USAR FUNÇÃO CENTRALIZADA
      toast.success("Carregamento confirmado com sucesso!");
    },
    onError: (err: Error, nfId) => {
      error('❌ Erro na confirmação:', err);
      audit('NF_CONFIRMACAO_ERRO', 'NF', { nfId, error: err.message });
      toast.error(err.message);
    },
  });

  const recusar = useMutation({
    mutationFn: recusarNF,
    onSuccess: (_, nfId) => {
      audit('NF_RECUSADA', 'NF', { nfId });
      invalidateAll(); // USAR FUNÇÃO CENTRALIZADA
      toast.success("Carregamento recusado. NF retornada para armazenadas.");
    },
    onError: (err: Error, nfId) => {
      error('❌ Erro na recusa:', err);
      audit('NF_RECUSA_ERRO', 'NF', { nfId, error: err.message });
      toast.error(err.message);
    },
  });

  const excluir = useMutation({
    mutationFn: deleteNF,
    onSuccess: (_, nfId) => {
      audit('NF_EXCLUIDA', 'NF', { nfId });
      invalidateAll(); // USAR FUNÇÃO CENTRALIZADA
      toast.success("Nota fiscal excluída com sucesso!");
    },
    onError: (err: Error, nfId) => {
      error('❌ Erro na exclusão:', err);
      
      // Se a NF não foi encontrada, significa que já foi excluída
      // Neste caso, invalidamos as queries para atualizar a UI
      if (err.message.includes('não encontrada') || err.message.includes('já foi excluída')) {
        audit('NF_EXCLUIDA_JA_REMOVIDA', 'NF', { nfId, message: 'NF já estava excluída, atualizando UI' });
        invalidateAll(); // Refresh UI to remove stale data
        toast.success("Nota fiscal removida da lista (já estava excluída)");
        return;
      }
      
      audit('NF_EXCLUSAO_ERRO', 'NF', { nfId, error: err.message });
      toast.error(err.message);
    },
  });

  return {
    solicitar,
    confirmar,
    recusar,
    excluir,
    isAnyLoading: solicitar.isPending || confirmar.isPending || recusar.isPending || excluir.isPending
  };
}