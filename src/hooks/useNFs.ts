import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitarNF, confirmarNF, recusarNF, fetchNFsByStatus } from "@/lib/nfApi";
import { toast } from "@/hooks/use-toast";
import type { NFStatus, NotaFiscal } from "@/types/nf";

const NF_QUERY_KEY = "nfs";

export function useNFs(status: NFStatus) {
  return useQuery({
    queryKey: [NF_QUERY_KEY, status],
    queryFn: () => fetchNFsByStatus(status),
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
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
  
  const invalidateAll = () => {
    console.log('🔄 Invalidando cache de todas as NFs');
    const statuses: NFStatus[] = ["ARMAZENADA", "SOLICITADA", "CONFIRMADA"];
    statuses.forEach(status => 
      queryClient.invalidateQueries({ queryKey: [NF_QUERY_KEY, status] })
    );
  };

  const solicitar = useMutation({
    mutationFn: solicitarNF,
    onSuccess: () => {
      invalidateAll();
      toast({
        title: "Sucesso",
        description: "Carregamento solicitado com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('❌ Erro na solicitação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    },
  });

  const confirmar = useMutation({
    mutationFn: confirmarNF,
    onSuccess: () => {
      invalidateAll();
      toast({
        title: "Sucesso", 
        description: "Carregamento confirmado com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('❌ Erro na confirmação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    },
  });

  const recusar = useMutation({
    mutationFn: recusarNF,
    onSuccess: () => {
      invalidateAll();
      toast({
        title: "Sucesso",
        description: "Carregamento recusado. NF retornada para armazenadas.",
      });
    },
    onError: (error: Error) => {
      console.error('❌ Erro na recusa:', error);
      toast({
        variant: "destructive", 
        title: "Erro",
        description: error.message,
      });
    },
  });

  return { 
    solicitar, 
    confirmar, 
    recusar,
    isAnyLoading: solicitar.isPending || confirmar.isPending || recusar.isPending
  };
}