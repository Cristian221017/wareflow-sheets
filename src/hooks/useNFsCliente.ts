import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NFStatus } from '@/types/nf';
import { useAgendamentoUnificado } from './useAgendamentoUnificado';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces para tipagem explícita
interface AgendamentoParams {
  nfId: string;
  dataAgendamento?: string;
  observacoes?: string;
  documentos?: File[];
}

interface AgendarResult {
  nfNumero: string;
  anexosCount: number;
}

// Hook para buscar NFs do cliente com dados de solicitação
export function useNFsCliente(status?: NFStatus) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['nfs-cliente', user?.id ?? 'anon', status ?? 'todas'],
    queryFn: async () => {
      console.log('🔍 Buscando NFs do cliente - Query executada:', { userId: user?.id, status });
      
      // Query otimizada - buscar NFs básicas primeiro com TODOS os campos necessários
       let query = supabase
        .from('notas_fiscais')
        .select(`
          id, numero_nf, numero_pedido, ordem_compra, produto, 
          fornecedor, quantidade, peso, volume, localizacao, 
          data_recebimento, status, status_separacao,
          cliente_id, transportadora_id, created_at, updated_at,
          requested_at, requested_by, approved_at, approved_by,
          data_embarque, data_entrega, observacoes_solicitacao,
          data_agendamento_entrega, documentos_anexos
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: nfsData, error: nfsError } = await query;
      if (nfsError) {
        console.error('❌ Erro ao buscar NFs:', nfsError);
        throw nfsError;
      }

      console.log('📋 NFs encontradas no banco:', nfsData?.length || 0);
      
      // Buscar dados de solicitações para as NFs
      if (!nfsData?.length) return [];

      const nfIds = nfsData.map((nf: any) => nf.id);
      const { data: solicitacoes, error: solicitacoesError } = await (supabase as any)
        .from('solicitacoes_carregamento')
        .select('nf_id, data_agendamento, observacoes, anexos, status, requested_at, requested_by')
        .in('nf_id', nfIds);

      if (solicitacoesError) {
        console.warn('⚠️ Erro ao buscar solicitações:', solicitacoesError);
        // Continuar mesmo com erro nas solicitações
      }

      // Mapear e unificar dados com logs detalhados
      const nfsMapeadas = nfsData?.map((nf: any) => {
        const solicitacao = solicitacoes?.find((s: any) => s.nf_id === nf.id);
        
        // Parsing dos anexos (podem vir como string JSON do banco)
        let documentosAnexos = [];
        if (solicitacao?.anexos) {
          if (Array.isArray(solicitacao.anexos)) {
            documentosAnexos = solicitacao.anexos;
          } else if (typeof solicitacao.anexos === 'string') {
            try {
              documentosAnexos = JSON.parse(solicitacao.anexos);
            } catch (e) {
              console.warn('❌ Erro ao parsear anexos cliente:', e);
              documentosAnexos = [];
            }
          }
        }
        
        const nfProcessada = {
          ...nf,
          // Dados da solicitação (sobrescrever se existir)
          data_agendamento_entrega: solicitacao?.data_agendamento || nf.data_agendamento_entrega,
          observacoes_solicitacao: solicitacao?.observacoes || nf.observacoes_solicitacao,
          documentos_anexos: documentosAnexos.length > 0 ? documentosAnexos : (nf.documentos_anexos || []),
        };
        
        console.log('🔍 NF Cliente processada:', {
          nf_id: nf.id,
          numero_nf: nf.numero_nf,
          status: nf.status,
          status_separacao: nf.status_separacao,
          data_embarque: nf.data_embarque,
          data_entrega: nf.data_entrega,
          tem_solicitacao: !!solicitacao,
          data_agendamento: solicitacao?.data_agendamento,
          observacoes: solicitacao?.observacoes,
          anexos_count: documentosAnexos.length
        });
        
        return nfProcessada;
      }) || [];
      
      console.log('📊 RESUMO NFs processadas:', {
        total: nfsMapeadas.length,
        por_status: nfsMapeadas.reduce((acc, nf) => {
          acc[nf.status] = (acc[nf.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        por_status_separacao: nfsMapeadas.reduce((acc, nf) => {
          const status = nf.status_separacao || 'pendente';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        em_viagem: nfsMapeadas.filter(nf => nf.data_embarque && !nf.data_entrega).length,
        entregues: nfsMapeadas.filter(nf => nf.data_entrega || nf.status_separacao === 'entregue').length
      });
      
      return nfsMapeadas;
    },
    enabled: !!(user && user.id),
    staleTime: 10 * 1000, // 10 segundos - mais agressivo para mudanças rápidas
    refetchOnWindowFocus: true, // Ativar para garantir sincronização
    refetchInterval: 30 * 1000, // Refetch automático a cada 30 segundos
    retry: 3, // Tentar novamente em caso de erro
    retryDelay: 1000, // Delay entre tentativas
  });
}

// Hook para mutations do cliente (solicitar carregamento com agendamento)
export function useClienteFluxoMutations() {
  const { solicitarCarregamentoComAgendamento, isLoading } = useAgendamentoUnificado();

  const solicitar = {
    mutate: (params: AgendamentoParams) => {
      solicitarCarregamentoComAgendamento.mutate(params);
    },
    mutateAsync: async (params: AgendamentoParams): Promise<void> => {
      await solicitarCarregamentoComAgendamento.mutateAsync(params);
      // Retorna void para manter compatibilidade com componentes existentes
    },
    isPending: isLoading
  };

  return {
    solicitar,
    isLoading
  };
}