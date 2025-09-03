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
      let query = supabase
        .from('notas_fiscais')
        .select(`
          *,
          solicitacoes_carregamento(
            data_agendamento,
            observacoes,
            anexos,
            status,
            requested_at,
            approved_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Transformar dados para incluir informações das solicitações na NF
      return data?.map((item: any) => {
        const nf = { ...item };
        const solicitacao = item.solicitacoes_carregamento?.[0];
        
        if (solicitacao) {
          nf.data_agendamento_entrega = solicitacao.data_agendamento;
          nf.observacoes_solicitacao = solicitacao.observacoes;
          // Combinar documentos da solicitação com documentos anexados diretamente à NF
          const documentosSolicitacao = solicitacao.anexos || [];
          const documentosNF = nf.documentos_anexos || [];
          nf.documentos_anexos = [...documentosNF, ...documentosSolicitacao];
          nf.requested_at = solicitacao.requested_at;
          nf.approved_at = solicitacao.approved_at;
        }
        
        // Remover array de solicitações do objeto final
        delete nf.solicitacoes_carregamento;
        
        return {
          ...nf,
          status_separacao: nf.status_separacao || 'pendente'
        };
      }) || [];
    },
    staleTime: 0, // Always consider data stale for immediate refetch after invalidation
    enabled: !!(user && user.id), // Só executar se usuário autenticado
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