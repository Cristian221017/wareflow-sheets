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
      // Query otimizada - buscar apenas campos essenciais
      let query = supabase
        .from('notas_fiscais')
        .select(`
          id, numero_nf, produto, status, status_separacao, 
          peso, volume, localizacao, created_at, updated_at,
          cliente_id, transportadora_id
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data?.map((nf: any) => ({
        ...nf,
        status_separacao: nf.status_separacao || 'pendente'
      })) || [];
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