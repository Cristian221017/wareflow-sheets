import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { audit, auditError } from '@/utils/logger';

// Hook para buscar solicitações da transportadora (unifica dados de ambas as fontes)
export function useSolicitacoesTransportadora(status: 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'TODAS' = 'PENDENTE') {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['solicitacoes', 'transportadora', user?.transportadoraId ?? 'none', status ?? 'PENDENTE'],
    queryFn: async () => {
      if (!user?.transportadoraId) return [];
      
      // 1. Buscar solicitações na tabela moderna
      let queryModernas = (supabase as any)
        .from('solicitacoes_carregamento')
        .select(`
          *,
          notas_fiscais(numero_nf, produto, numero_pedido, ordem_compra, peso, volume, quantidade, fornecedor, localizacao, data_recebimento, created_at, cliente_id),
          clientes(razao_social, cnpj)
        `)
        .eq('transportadora_id', user.transportadoraId)
        .order('requested_at', { ascending: false });
      
      if (status !== 'TODAS') {
        queryModernas = queryModernas.eq('status', status);
      }
      
      const { data: solicitacoesModernas, error: errorModernas } = await queryModernas;
      if (errorModernas) throw errorModernas;

      // 2. Buscar NFs com status SOLICITADA que não têm entrada em solicitacoes_carregamento (legado)
      const nfStatusMap = status === 'PENDENTE' || status === 'TODAS' ? 'SOLICITADA' : null;
      let nfsLegado: any[] = [];
      
      if (nfStatusMap) {
        // Primeiro buscar todas as NFs SOLICITADAS
        const { data: todasNfsData, error: todasNfsError } = await (supabase as any)
          .from('notas_fiscais')
          .select(`
            id, numero_nf, numero_pedido, ordem_compra, produto, peso, volume, quantidade, 
            fornecedor, localizacao, data_recebimento, created_at, cliente_id, requested_at, requested_by,
            clientes(razao_social, cnpj)
          `)
          .eq('transportadora_id', user.transportadoraId)
          .eq('status', nfStatusMap);

        if (todasNfsError) throw todasNfsError;
        
        // Filtrar para excluir as que já têm entrada em solicitacoes_carregamento
        const nfsComSolicitacao = new Set((solicitacoesModernas || []).map((s: any) => s.nf_id).filter(Boolean));
        nfsLegado = (todasNfsData || []).filter((nf: any) => !nfsComSolicitacao.has(nf.id));
      }

      // 3. Unificar dados no formato esperado
      const solicitacoesUnificadas = [
        // Solicitações modernas (mantém formato original)
        ...(solicitacoesModernas || []),
        // NFs legado convertidas para formato de solicitação
        ...nfsLegado.map((nf: any) => ({
          id: `legacy-${nf.id}`, // ID único para identificar como legado
          nf_id: nf.id,
          transportadora_id: user.transportadoraId,
          cliente_id: nf.cliente_id,
          data_agendamento: null,
          observacoes: null,
          anexos: [],
          status: 'PENDENTE',
          requested_by: nf.requested_by,
          requested_at: nf.requested_at,
          approved_by: null,
          approved_at: null,
          created_at: nf.requested_at,
          updated_at: nf.requested_at,
          notas_fiscais: {
            numero_nf: nf.numero_nf,
            produto: nf.produto,
            numero_pedido: nf.numero_pedido,
            ordem_compra: nf.ordem_compra,
            peso: nf.peso,
            volume: nf.volume,
            quantidade: nf.quantidade,
            fornecedor: nf.fornecedor,
            localizacao: nf.localizacao,
            data_recebimento: nf.data_recebimento,
            created_at: nf.created_at,
            cliente_id: nf.cliente_id
          },
          clientes: nf.clientes
        }))
      ].sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
      
      return solicitacoesUnificadas;
    },
    enabled: !!(user && user.transportadoraId),
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
}

// Hook para buscar solicitações do cliente
export function useSolicitacoesCliente(status: 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'TODAS' = 'TODAS') {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['solicitacoes', 'cliente', user?.id ?? 'anon', status ?? 'TODAS'],
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
    enabled: !!(user && user.id),
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
      // Verificar se é solicitação legado
      if (solicitacaoId.startsWith('legacy-')) {
        const nfId = solicitacaoId.replace('legacy-', '');
        // Para solicitações legado, confirmar diretamente a NF
        const { error: nfError } = await supabase.rpc('nf_confirmar', {
          p_nf_id: nfId,
          p_user_id: user?.id
        });
        if (nfError) throw nfError;
      } else {
        // Para solicitações modernas, atualizar tabela de solicitações primeiro
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
      }
    },
    onSuccess: () => {
      toast.success('Solicitação aprovada com sucesso!');
      audit('SC_APPROVE', 'SOLICITACAO', { userId: user?.id });
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'cliente'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'transportadora'] });
      queryClient.invalidateQueries({ queryKey: ['nfs'] });
    },
    onError: (error) => {
      toast.error('Erro ao aprovar solicitação');
      auditError('SC_APPROVE_FAIL', 'SOLICITACAO', error, { userId: user?.id });
    }
  });

  const recusarSolicitacao = useMutation({
    mutationFn: async (solicitacaoId: string) => {
      // Verificar se é solicitação legado
      if (solicitacaoId.startsWith('legacy-')) {
        const nfId = solicitacaoId.replace('legacy-', '');
        // Para solicitações legado, recusar diretamente a NF
        const { error: nfError } = await supabase.rpc('nf_recusar', {
          p_nf_id: nfId,
          p_user_id: user?.id
        });
        if (nfError) throw nfError;
      } else {
        // Para solicitações modernas, atualizar tabela de solicitações primeiro
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
      }
    },
    onSuccess: () => {
      toast.success('Solicitação recusada');
      audit('SC_REJECT', 'SOLICITACAO', { userId: user?.id });
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'cliente'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'transportadora'] });
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