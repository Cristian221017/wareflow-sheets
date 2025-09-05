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
    queryKey: ['nfs', 'cliente', user?.id ?? 'anon', status ?? 'todas'],
    queryFn: async () => {
      // Query otimizada - buscar NFs básicas primeiro
      let query = supabase
        .from('notas_fiscais')
        .select(`
          id, numero_nf, numero_pedido, ordem_compra, produto, 
          fornecedor, quantidade, peso, volume, localizacao, 
          data_recebimento, status,
          cliente_id, transportadora_id, created_at, updated_at,
          requested_at, requested_by, approved_at, approved_by
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: nfsData, error: nfsError } = await query;
      if (nfsError) throw nfsError;

      // Buscar dados de solicitações para as NFs (query sem tipagem)
      if (!nfsData?.length) return [];

      const nfIds = nfsData.map((nf: any) => nf.id);
      const { data: solicitacoes } = await (supabase as any)
        .from('solicitacoes_carregamento')
        .select('nf_id, data_agendamento, observacoes, anexos, status, requested_at, requested_by')
        .in('nf_id', nfIds);

      // Mapear e unificar dados
      return nfsData?.map((nf: any) => {
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
        
        console.log('🔍 NF Cliente mapeada:', {
          nf_id: nf.id,
          numero_nf: nf.numero_nf,
          status: nf.status,
          tem_solicitacao: !!solicitacao,
          data_agendamento: solicitacao?.data_agendamento,
          observacoes: solicitacao?.observacoes,
          anexos_count: solicitacao?.anexos?.length || 0,
          anexos_raw: solicitacao?.anexos,
          anexos_parsed: !!documentosAnexos.length
        });
        
        return {
          ...nf,
          status_separacao: 'pendente', // Valor padrão
          // Dados da solicitação
          data_agendamento_entrega: solicitacao?.data_agendamento,
          observacoes_solicitacao: solicitacao?.observacoes,
          documentos_anexos: documentosAnexos,
        };
      }) || [];
    },
    enabled: !!(user && user.id),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    refetchInterval: false,
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