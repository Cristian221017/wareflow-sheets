import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { solicitarNF } from '@/lib/nfApi';
import { fetchNFsCliente } from '@/lib/nfApi';
import type { NFStatus } from '@/types/nf';
import { log, audit, auditError } from '@/utils/logger';
import { toast } from 'sonner';

export function useNFsCliente(status?: NFStatus) {
  return useQuery({
    queryKey: ['nfs', 'cliente', status ?? 'todas'],
    queryFn: async () => {
      try {
        log('🔍 Buscando NFs do cliente via hook', { status });
        return await fetchNFsCliente(status);
      } catch (err: any) {
        auditError('NF_HOOK_CLIENTE_ERROR', 'NF', err, { status });
        throw err;
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useClienteFluxoMutations() {
  const queryClient = useQueryClient();
  
  const invalidateAll = () => {
    log('🔄 Invalidando cache de todas as NFs do cliente');
    const statuses: NFStatus[] = ["ARMAZENADA", "SOLICITADA", "CONFIRMADA"];
    statuses.forEach(status => {
      queryClient.invalidateQueries({ queryKey: ['nfs', 'cliente', status] });
    });
    queryClient.invalidateQueries({ queryKey: ['nfs', 'cliente', 'todas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const solicitar = useMutation({
    mutationFn: (data: { 
      nfId: string; 
      dadosAgendamento?: { 
        dataAgendamento?: string; 
        observacoes?: string; 
        documentos?: Array<{nome: string; tamanho: number}> 
      } 
    }) => {
      log('📝 Cliente solicitando carregamento com dados:', data);
      return solicitarNF(data.nfId, data.dadosAgendamento);
    },
    onSuccess: (_, data) => {
      audit('NF_SOLICITADA_CLIENTE', 'NF', { 
        nfId: data.nfId, 
        dadosAgendamento: data.dadosAgendamento 
      });
      invalidateAll();
      toast.success("Carregamento solicitado com sucesso!");
      log('✅ Solicitação de carregamento bem-sucedida:', data);
    },
    onError: (err: Error, data) => {
      auditError('NF_SOLICITACAO_CLIENTE_ERRO', 'NF', err, { 
        nfId: data.nfId, 
        dadosAgendamento: data.dadosAgendamento 
      });
      toast.error(`Erro ao solicitar carregamento: ${err.message}`);
      log('❌ Erro na solicitação de carregamento:', { err, data });
    },
  });

  return { 
    solicitar,
    isLoading: solicitar.isPending
  };
}