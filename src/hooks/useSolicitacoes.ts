import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { audit, auditError } from '@/utils/logger';

// Simplificando - usar queries diretas do Supabase sem funções RPC customizadas
export function useSolicitacoesTransportadora() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['solicitacoes', 'transportadora', user?.transportadoraId],
    queryFn: async () => {
      if (!user?.transportadoraId) return [];
      
      // Por enquanto, vamos retornar vazio até implementarmos a view completa
      return [];
    },
    enabled: !!user?.transportadoraId,
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
}

// Hook simplificado para mutações
export function useSolicitacoesMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const aprovarSolicitacao = useMutation({
    mutationFn: async (nfId: string) => {
      // Usar a função RPC existente para confirmar NF
      const { error } = await supabase.rpc('nf_confirmar', {
        p_nf_id: nfId,
        p_user_id: user?.id
      });

      if (error) throw error;
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
    mutationFn: async (nfId: string) => {
      // Usar a função RPC existente para recusar NF
      const { error } = await supabase.rpc('nf_recusar', {
        p_nf_id: nfId,
        p_user_id: user?.id
      });

      if (error) throw error;
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