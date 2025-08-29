import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { audit, auditError } from '@/utils/logger';

// Hook para buscar solicitações da transportadora
export function useSolicitacoesTransportadora(status: 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'TODAS' = 'PENDENTE') {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['solicitacoes', 'transportadora', user?.transportadoraId, status],
    queryFn: async () => {
      if (!user?.transportadoraId) return [];
      
      let query = (supabase as any)
        .from('solicitacoes_carregamento')
        .select(`
          *,
          notas_fiscais(numero_nf, produto, numero_pedido, ordem_compra),
          clientes(razao_social, cnpj)
        `)
        .eq('transportadora_id', user.transportadoraId)
        .order('requested_at', { ascending: false });
      
      if (status !== 'TODAS') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user?.transportadoraId,
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
}

// Hook para buscar solicitações do cliente
export function useSolicitacoesCliente(status: 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'TODAS' = 'TODAS') {
  return useQuery({
    queryKey: ['solicitacoes', 'cliente', status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('solicitacoes_carregamento')
        .select(`
          *,
          notas_fiscais(numero_nf, produto, numero_pedido, ordem_compra),
          transportadoras(razao_social)
        `)
        .order('requested_at', { ascending: false });
      
      if (status !== 'TODAS') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
}

// Hook simplificado para mutações
export function useSolicitacoesMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const aprovarSolicitacao = useMutation({
    mutationFn: async (solicitacaoId: string) => {
      // Primeiro, atualizar status da solicitação
      const { data: solicitacao, error: updateError } = await (supabase as any)
        .from('solicitacoes_carregamento')
        .update({ 
          status: 'APROVADA',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', solicitacaoId)
        .select('nf_id')
        .single();

      if (updateError) throw updateError;

      // Depois, confirmar a NF
      const { error: nfError } = await supabase.rpc('nf_confirmar', {
        p_nf_id: (solicitacao as any).nf_id,
        p_user_id: user?.id
      });

      if (nfError) throw nfError;
    },
    onSuccess: () => {
      toast.success('Solicitação aprovada com sucesso!');
      audit('SC_APPROVE', 'SOLICITACAO', { userId: user?.id });
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['nfs'] });
    },
    onError: (error) => {
      toast.error('Erro ao aprovar solicitação');
      auditError('SC_APPROVE_FAIL', 'SOLICITACAO', error, { userId: user?.id });
    }
  });

  const recusarSolicitacao = useMutation({
    mutationFn: async (solicitacaoId: string) => {
      // Primeiro, atualizar status da solicitação
      const { data: solicitacao, error: updateError } = await (supabase as any)
        .from('solicitacoes_carregamento')
        .update({ 
          status: 'RECUSADA',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', solicitacaoId)
        .select('nf_id')
        .single();

      if (updateError) throw updateError;

      // Depois, recusar a NF
      const { error: nfError } = await supabase.rpc('nf_recusar', {
        p_nf_id: (solicitacao as any).nf_id,
        p_user_id: user?.id
      });

      if (nfError) throw nfError;
    },
    onSuccess: () => {
      toast.success('Solicitação recusada');
      audit('SC_REJECT', 'SOLICITACAO', { userId: user?.id });
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['nfs'] });
    },
    onError: (error) => {
      toast.error('Erro ao recusar solicitação');
      auditError('SC_REJECT_FAIL', 'SOLICITACAO', error, { userId: user?.id });
    }
  });

  return {
    aprovar: aprovarSolicitacao,
    recusar: recusarSolicitacao,
    isLoading: aprovarSolicitacao.isPending || recusarSolicitacao.isPending
  };
}