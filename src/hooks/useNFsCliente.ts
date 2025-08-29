import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NFStatus } from '@/types/nf';
import { toast } from 'sonner';
import { audit, auditError } from '@/utils/logger';
import { solicitarCarregamentoComAgendamento, uploadAnexoSolicitacao } from '@/lib/nfApi';
import { useAuth } from '@/contexts/AuthContext';

// Hook para buscar NFs do cliente
export function useNFsCliente(status?: NFStatus) {
  return useQuery({
    queryKey: ['nfs', 'cliente', status],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data?.map(nf => ({
        ...nf,
        status_separacao: (nf as any).status_separacao || 'pendente'
      })) || [];
    }
  });
}

// Hook para mutations do cliente (solicitar carregamento com agendamento)
export function useClienteFluxoMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const solicitar = useMutation({
    mutationFn: async (params: {
      nfId: string;
      dataAgendamento?: string;
      observacoes?: string;
      documentos?: File[];
    }): Promise<void> => {
      const { nfId, dataAgendamento, observacoes, documentos } = params;
      
      // Buscar informações do cliente para o upload
      const { data: nfData } = await supabase
        .from('notas_fiscais')
        .select('cliente_id')
        .eq('id', nfId)
        .single();
        
      if (!nfData?.cliente_id) {
        throw new Error('NF não encontrada ou sem cliente associado');
      }
      
      let anexos: Array<{ name: string; path: string; size: number; contentType: string }> = [];
      
      // Upload dos documentos se existirem
      if (documentos && documentos.length > 0) {
        try {
          const uploadPromises = documentos.map(file => 
            uploadAnexoSolicitacao(nfData.cliente_id, nfId, file)
          );
          anexos = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Erro no upload dos anexos:', uploadError);
          toast.error('Erro ao fazer upload dos anexos');
          throw uploadError;
        }
      }
      
      // Chamar a função de solicitação
      await solicitarCarregamentoComAgendamento({
        nfId,
        dataAgendamento,
        observacoes,
        anexos
      });
    },
    onSuccess: () => {
      toast.success('Carregamento solicitado com sucesso!');
      audit('SC_CREATE', 'SOLICITACAO', { userId: user?.id });
      
      // Invalidar as queries para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['nfs'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    },
    onError: (error) => {
      console.error('Erro detalhado:', error);
      toast.error('Erro ao solicitar carregamento');
      auditError('SC_CREATE_FAIL', 'SOLICITACAO', error, { userId: user?.id });
    }
  });
  
  return {
    solicitar,
    isLoading: solicitar.isPending
  };
}