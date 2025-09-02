import { supabase } from '@/integrations/supabase/client';
import { log, warn, error } from '@/utils/logger';

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * Função para diagnóstico rápido de problemas no sistema
 */
export async function runSystemDiagnostic(transportadoraId?: string): Promise<DiagnosticResult> {
  log('🔍 Iniciando diagnóstico do sistema...');
  
  const result: DiagnosticResult = {
    success: true,
    message: 'Sistema funcionando normalmente',
    details: {}
  };

  try {
    // 1. Verificar conexão com Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      result.success = false;
      result.message = 'Erro na autenticação';
      result.details!.authError = authError.message;
      return result;
    }

    const userId = authData.user?.id;
    if (!userId) {
      result.success = false;
      result.message = 'Usuário não autenticado';
      return result;
    }

    // 2. Testar função RPC do dashboard
    const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_current_user_dashboard' as any);
    if (dashboardError) {
      result.success = false;
      result.message = 'Erro na função RPC do dashboard';
      result.details!.rpcError = dashboardError.message;
      return result;
    }

    result.details!.dashboardStats = dashboardData?.[0] || null;

    // 3. Verificar acesso a tabelas principais se transportadoraId disponível
    if (transportadoraId) {
      // Test notas_fiscais access
      const { data: nfsTest, error: nfsError } = await supabase
        .from('notas_fiscais')
        .select('id, status')
        .eq('transportadora_id', transportadoraId)
        .limit(1);

      if (nfsError) {
        warn('⚠️ Problemas de acesso a notas_fiscais:', nfsError);
        result.details!.nfsError = nfsError.message;
      } else {
        result.details!.nfsAccessOk = true;
        result.details!.nfsCount = nfsTest?.length || 0;
      }

      // Test solicitacoes_carregamento access
      const { data: solicitacoesTest, error: solicitacoesError } = await (supabase as any)
        .from('solicitacoes_carregamento')
        .select('id, status')
        .eq('transportadora_id', transportadoraId)
        .limit(1);

      if (solicitacoesError) {
        warn('⚠️ Problemas de acesso a solicitacoes_carregamento:', solicitacoesError);
        result.details!.solicitacoesError = solicitacoesError.message;
      } else {
        result.details!.solicitacoesAccessOk = true;
        result.details!.solicitacoesCount = solicitacoesTest?.length || 0;
      }
    }

    // 4. Verificar se há dados órfãos ou problemas de relação
    if (transportadoraId) {
      const { data: orphanedCheck } = await (supabase as any)
        .from('solicitacoes_carregamento')
        .select(`
          id, nf_id,
          notas_fiscais:nf_id(id, numero_nf)
        `)
        .eq('transportadora_id', transportadoraId)
        .limit(5);

      const orphanedSolicitacoes = (orphanedCheck || []).filter((s: any) => !s.notas_fiscais);
      if (orphanedSolicitacoes.length > 0) {
        warn('⚠️ Solicitações órfãs detectadas:', orphanedSolicitacoes.length);
        result.details!.orphanedSolicitacoes = orphanedSolicitacoes.length;
      }
    }

    log('✅ Diagnóstico do sistema concluído:', result);
    return result;

  } catch (err) {
    error('❌ Erro no diagnóstico do sistema:', err);
    result.success = false;
    result.message = `Erro crítico: ${String(err)}`;
    return result;
  }
}