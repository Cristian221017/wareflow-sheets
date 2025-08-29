import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitarNF, confirmarNF, recusarNF, fetchNFsByStatus } from "@/lib/nfApi";
import { toast } from "sonner";
import { log, audit, error } from "@/utils/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useInvalidateAll } from "./useInvalidateAll";
import type { NFStatus, NotaFiscal } from "@/types/nf";

const NF_QUERY_KEY = "nfs";

export function useNFs(status: NFStatus) {
  const { user } = useAuth();
  const scope = user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId;
  
  return useQuery({
    queryKey: ['nfs', status, user?.type, scope],
    queryFn: () => fetchNFsByStatus(status),
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
    enabled: !!user?.id && !!scope, // Só executar se usuário estiver autenticado e com escopo
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
  
  const solicitar = useMutation({
    mutationFn: (data: { nfId: string; dadosAgendamento?: { dataAgendamento?: string; observacoes?: string; documentos?: Array<{nome: string; tamanho: number}> } }) => 
      solicitarNF(data.nfId, data.dadosAgendamento),
    onSuccess: (_, data) => {
      audit('NF_SOLICITADA', 'NF', { nfId: data.nfId, dadosAgendamento: data.dadosAgendamento });
      invalidateAll(); // USAR FUNÇÃO CENTRALIZADA
      toast.success("Carregamento solicitado com sucesso!");
    },
    onError: (err: Error, data) => {
      error('❌ Erro na solicitação:', err);
      audit('NF_SOLICITACAO_ERRO', 'NF', { nfId: data.nfId, error: err.message });
      toast.error(err.message);
    },
  });

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

  return { 
    solicitar, 
    confirmar, 
    recusar,
    isAnyLoading: solicitar.isPending || confirmar.isPending || recusar.isPending
  };
}