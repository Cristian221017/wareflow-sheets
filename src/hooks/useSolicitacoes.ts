import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { audit, auditError } from '@/utils/logger';
import { useInvalidateAll } from './useInvalidateAll';

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
          id, nf_id, transportadora_id, cliente_id, data_agendamento, observacoes, anexos, status,
          requested_by, requested_at, approved_by, approved_at, created_at, updated_at,
          notas_fiscais:nf_id(
            id, cliente_id, numero_nf, numero_pedido, ordem_compra, fornecedor, produto,
            quantidade, peso, volume, localizacao, data_recebimento, created_at, status_separacao
          ),
          clientes:cliente_id(id, razao_social, cnpj)
        `)
        .eq('transportadora_id', user.transportadoraId)
        .order('requested_at', { ascending: false });
      
      if (status !== 'TODAS') {
        queryModernas = queryModernas.eq('status', status);
      }
      
      const { data: solicitacoesModernas, error: errorModernas } = await queryModernas;
      if (errorModernas) throw errorModernas;

      // Fallback defensivo: hidratar NFs caso embed falhe por RLS/relacionamento
      async function hydrateNF(sol: any) {
        if (sol?.notas_fiscais || !sol?.nf_id) return sol;
        
        const { data: nfRow } = await supabase
          .from('notas_fiscais')
          .select('id, cliente_id, numero_nf, numero_pedido, ordem_compra, fornecedor, produto, quantidade, peso, volume, localizacao, data_recebimento, created_at, status_separacao')
          .eq('id', sol.nf_id)
          .maybeSingle();
          
        if (nfRow) {
          sol.notas_fiscais = nfRow;
        } else {
          // Log quando embed falha
          audit('SC_EMBED_EMPTY', 'SOLICITACAO', { solicitacaoId: sol.id, nfId: sol.nf_id });
        }
        
        return sol;
      }

      // Aplicar hidratação em solicitações modernas
      const modernasHydrated = await Promise.all((solicitacoesModernas || []).map(hydrateNF));

      // 2. Buscar NFs com status SOLICITADA que não têm entrada em solicitacoes_carregamento (legado)
      const nfStatusMap = status === 'PENDENTE' || status === 'TODAS' ? 'SOLICITADA' : null;
      let nfsLegado: any[] = [];
      
      if (nfStatusMap) {
        // Primeiro buscar todas as NFs SOLICITADAS
        const { data: todasNfsData, error: todasNfsError } = await (supabase as any)
          .from('notas_fiscais')
          .select(`
            id, numero_nf, numero_pedido, ordem_compra, produto, peso, volume, quantidade, 
            fornecedor, localizacao, data_recebimento, created_at, cliente_id, requested_at, requested_by, status_separacao,
            clientes(razao_social, cnpj)
          `)
          .eq('transportadora_id', user.transportadoraId)
          .eq('status', nfStatusMap);

        if (todasNfsError) throw todasNfsError;
        
        // Filtrar para excluir as que já têm entrada em solicitacoes_carregamento
        const nfsComSolicitacao = new Set((modernasHydrated || []).map((s: any) => s.nf_id).filter(Boolean));
        nfsLegado = (todasNfsData || []).filter((nf: any) => !nfsComSolicitacao.has(nf.id));
      }

      console.log('🔧 Solicitações modernas:', solicitacoesModernas?.length || 0);
      console.log('🔧 NFs legado:', nfsLegado?.length || 0);

      // 3. Unificar dados no formato esperado
      const solicitacoesUnificadas = [
        // Solicitações modernas (mapear dados aninhados para o nível superior)
        ...(modernasHydrated || []).map((sol: any) => {
          console.log('🔧 Solicitação moderna mapeada:', {
            id: sol.id,
            numero_nf: sol.notas_fiscais?.numero_nf,
            produto: sol.notas_fiscais?.produto,
            status_separacao: sol.notas_fiscais?.status_separacao,
            dados_completos: !!sol.notas_fiscais
          });
          return {
            ...sol,
            // Achatar dados da NF para compatibilidade com NFCard
            numero_nf: sol.notas_fiscais?.numero_nf || '',
            produto: sol.notas_fiscais?.produto || '',
            numero_pedido: sol.notas_fiscais?.numero_pedido || '',
            ordem_compra: sol.notas_fiscais?.ordem_compra || '',
            peso: sol.notas_fiscais?.peso || 0,
            volume: sol.notas_fiscais?.volume || 0,
            quantidade: sol.notas_fiscais?.quantidade || 0,
            fornecedor: sol.notas_fiscais?.fornecedor || '',
            localizacao: sol.notas_fiscais?.localizacao || '',
            data_recebimento: sol.notas_fiscais?.data_recebimento || '',
            status_separacao: sol.notas_fiscais?.status_separacao || 'pendente',
            // Mapear anexos para documentos_anexos para compatibilidade com NFCard
            documentos_anexos: sol.anexos || [],
            data_agendamento_entrega: sol.data_agendamento,
            observacoes_solicitacao: sol.observacoes,
          };
        }),
        // NFs legado convertidas para formato de solicitação
        ...nfsLegado.map((nf: any) => {
          console.log('🔧 NF legado mapeada:', {
            id: `legacy-${nf.id}`,
            numero_nf: nf.numero_nf,
            produto: nf.produto
          });
          return {
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
            // Dados da NF achatados para compatibilidade com NFCard
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
            status_separacao: nf.status_separacao || 'pendente',
            // Mapear campos para compatibilidade com NFCard
            documentos_anexos: [],
            data_agendamento_entrega: null,
            observacoes_solicitacao: null,
            // Manter estrutura aninhada para compatibilidade
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
          };
        })
      ].sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
      
      console.log('🔧 Dados unificados finais:', solicitacoesUnificadas.length, 
        solicitacoesUnificadas.slice(0, 2).map(s => ({ id: s.id, numero_nf: s.numero_nf, produto: s.produto })));
      
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
  const { invalidateAll } = useInvalidateAll();

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
          .maybeSingle();

        if (updateError) throw updateError;
        if (!solicitacao) throw new Error('Solicitação não encontrada');

        // Depois, confirmar a NF
        const { error: nfError } = await supabase.rpc('nf_confirmar', {
          p_nf_id: solicitacao.nf_id,
          p_user_id: user?.id
        });

        if (nfError) throw nfError;
      }
    },
    onSuccess: () => {
      toast.success('Solicitação aprovada com sucesso!');
      audit('SC_APPROVE', 'SOLICITACAO', { userId: user?.id });
      invalidateAll(); // USAR FUNÇÃO CENTRALIZADA
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
          .maybeSingle();

        if (updateError) throw updateError;
        if (!solicitacao) throw new Error('Solicitação não encontrada');

        // Depois, recusar a NF
        const { error: nfError } = await supabase.rpc('nf_recusar', {
          p_nf_id: solicitacao.nf_id,
          p_user_id: user?.id
        });

        if (nfError) throw nfError;
      }
    },
    onSuccess: () => {
      toast.success('Solicitação recusada');
      audit('SC_REJECT', 'SOLICITACAO', { userId: user?.id });
      invalidateAll(); // USAR FUNÇÃO CENTRALIZADA
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