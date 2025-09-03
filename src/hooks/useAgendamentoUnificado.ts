import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { uploadAnexoSolicitacao } from '@/lib/nfApi';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateAll } from './useInvalidateAll';
import { toast } from 'sonner';
import { log, auditError } from '@/utils/logger';

interface AgendamentoData {
  nfId: string;
  dataAgendamento?: string;
  observacoes?: string;
  documentos?: File[];
}

interface AgendarResult {
  nfNumero: string;
  anexosCount: number;
}

/**
 * Hook UNIFICADO para solicitação de carregamento com agendamento
 * Funciona igual para CLIENTE e TRANSPORTADORA
 * - Upload de anexos (se houver)
 * - RPC nf_solicitar_agendamento 
 * - Invalidação completa
 */
export function useAgendamentoUnificado() {
  const { user } = useAuth();
  const { invalidateAll } = useInvalidateAll();

  const solicitarCarregamentoComAgendamento = useMutation<AgendarResult, Error, AgendamentoData>({
    mutationFn: async (data: AgendamentoData) => {
      if (!user) {
        console.error('❌ Usuário não autenticado no agendamento unificado');
        throw new Error('Usuário não autenticado');
      }
      
      console.log('🚚 Solicitação unificada de carregamento iniciada:', { 
        data, 
        userType: user.type, 
        userEmail: user.email 
      });
      log('🚚 Solicitação unificada de carregamento:', data);

      // 1) Buscar dados da NF para obter cliente_id
      const { data: nfData, error: nfError } = await supabase
        .from('notas_fiscais')
        .select('cliente_id, numero_nf, status')
        .eq('id', data.nfId)
        .single();

      if (nfError || !nfData) {
        throw new Error('NF não encontrada');
      }

      if (nfData.status !== 'ARMAZENADA') {
        throw new Error(`NF não pode ser solicitada. Status atual: ${nfData.status}`);
      }

      // 2) Upload de anexos (se houver)
      const anexosPayload = [];
      if (data.documentos?.length) {
        log('📎 Fazendo upload de', data.documentos.length, 'anexos');
        for (const file of data.documentos) {
          const uploaded = await uploadAnexoSolicitacao(nfData.cliente_id, data.nfId, file);
          anexosPayload.push(uploaded);
        }
        log('✅ Upload de anexos concluído');
      }

      // 3) RPC unificado de agendamento
      console.log('📞 Chamando RPC nf_solicitar_agendamento:', {
        p_nf_id: data.nfId,
        p_data_agendamento: data.dataAgendamento ? new Date(data.dataAgendamento).toISOString() : null,
        p_observacoes: data.observacoes || null,
        p_anexos: anexosPayload.length > 0 ? JSON.stringify(anexosPayload) : null
      });

      const { error: rpcError } = await supabase.rpc('nf_solicitar_agendamento' as any, {
        p_nf_id: data.nfId,
        p_data_agendamento: data.dataAgendamento ? new Date(data.dataAgendamento).toISOString() : null,
        p_observacoes: data.observacoes || null,
        p_anexos: anexosPayload.length > 0 ? JSON.stringify(anexosPayload) : null
      });

      if (rpcError) {
        console.error('❌ Erro no RPC nf_solicitar_agendamento:', rpcError);
        throw rpcError;
      }

      // RPC executado com sucesso

      return { nfNumero: nfData.numero_nf, anexosCount: anexosPayload.length };
    },
    onSuccess: (result) => {
      const message = result.anexosCount > 0 
        ? `✅ Carregamento solicitado para NF ${result.nfNumero} com ${result.anexosCount} anexo(s)!`
        : `✅ Carregamento solicitado para NF ${result.nfNumero}!`;
      
      toast.success(message);
      
      // 🎯 Invalidação COMPLETA por predicate
      invalidateAll();
      
      log('✅ Solicitação unificada concluída:', result);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro ao solicitar carregamento';
      log('❌ Erro na solicitação unificada:', error);
      
      auditError('AGENDAMENTO_FAIL', 'NF', error, {
        nfId: undefined, // Não temos acesso aqui, mas o log já tem o contexto
        userType: user?.type
      });
      
      toast.error(errorMessage);
    }
  });

  return {
    solicitarCarregamentoComAgendamento,
    isLoading: solicitarCarregamentoComAgendamento.isPending
  };
}