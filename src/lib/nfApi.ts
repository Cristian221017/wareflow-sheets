import { supabase } from "@/integrations/supabase/client";
import { log, warn, error, audit, auditError } from "@/utils/logger";
import { getCurrentUserId } from "@/utils/authCache";
import type { NFStatus } from "@/types/nf";

export async function solicitarNF(nfId: string, dadosAgendamento?: {
  dataAgendamento?: string;
  observacoes?: string;
  documentos?: Array<{nome: string; tamanho: number}>;
}): Promise<void> {
  const userId = await getCurrentUserId();
  log('🚚 Solicitando carregamento NF:', { nfId, userId, dadosAgendamento });
  
  // Primeiro, solicitar via RPC
  const { error: rpcError } = await supabase.rpc("nf_solicitar", { 
    p_nf_id: nfId, 
    p_user_id: userId 
  });
  
  if (rpcError) {
    auditError('NF_SOLICITAR_FAIL', 'NF', rpcError, { nfId, userId });
    throw new Error(`Erro ao solicitar carregamento: ${rpcError.message}`);
  }
  
  // CORREÇÃO: Dados de agendamento devem ir para solicitacoes_carregamento, não notas_fiscais
  // Esses campos foram migrados para a tabela separada e são tratados pela nova função nf_solicitar_agendamento
  if (dadosAgendamento && (dadosAgendamento.dataAgendamento || dadosAgendamento.observacoes || dadosAgendamento.documentos)) {
    warn('⚠️ Dados de agendamento devem usar solicitarCarregamentoComAgendamento() em vez de solicitarNF()');
    log('📅 Para agendamento, use a função específica com anexos e data');
  }
  
  audit('NF_SOLICITADA', 'NF', { nfId, userId, dadosAgendamento });
  log('✅ NF solicitada com sucesso');
}

export async function confirmarNF(nfId: string): Promise<void> {
  const userId = await getCurrentUserId();
  log('✅ Confirmando carregamento NF:', { nfId, userId });
  
  const { error: rpcError } = await supabase.rpc("nf_confirmar", { 
    p_nf_id: nfId, 
    p_user_id: userId 
  });
  
  if (rpcError) {
    auditError('NF_CONFIRMAR_FAIL', 'NF', rpcError, { nfId, userId });
    throw new Error(`Erro ao confirmar carregamento: ${rpcError.message}`);
  }
  
  audit('NF_CONFIRMADA', 'NF', { nfId, userId });
  log('✅ NF confirmada com sucesso');
}

export async function recusarNF(nfId: string): Promise<void> {
  const userId = await getCurrentUserId();
  log('❌ Recusando carregamento NF:', { nfId, userId });
  
  const { error: rpcError } = await supabase.rpc("nf_recusar", { 
    p_nf_id: nfId, 
    p_user_id: userId 
  });
  
  if (rpcError) {
    auditError('NF_RECUSAR_FAIL', 'NF', rpcError, { nfId, userId });
    throw new Error(`Erro ao recusar carregamento: ${rpcError.message}`);
  }
  
  audit('NF_RECUSADA', 'NF', { nfId, userId });
  log('✅ NF recusada com sucesso');
}

export async function fetchNFsByStatus(status?: NFStatus) {
  log('📋 Buscando NFs com status:', status);
  
  // Verificar autenticação
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser.user?.id) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar NFs primeiro
  let nfQuery = supabase
    .from("notas_fiscais")
    .select(`
      id,
      numero_nf,
      numero_pedido,
      ordem_compra,
      cliente_id,
      transportadora_id,
      fornecedor,
      produto,
      quantidade,
      peso,
      volume,
      localizacao,
      data_recebimento,
      status,
      status_separacao,
      created_at,
      updated_at,
      requested_at,
      approved_at
    `)
    .order("created_at", { ascending: false });

  if (status) {
    nfQuery = nfQuery.eq("status", status);
  }

  const { data: nfs, error: fetchError } = await nfQuery;
  
  if (fetchError) {
    auditError('NF_FETCH_BY_STATUS_FAIL', 'NF', fetchError, { status, userId: authUser.user.id });
    throw new Error(`Erro ao buscar notas fiscais: ${fetchError.message}`);
  }

  // Filtrar NFs com status de separação 'em_viagem' ou 'entregue' quando status for ARMAZENADA
  let filteredNFs = nfs || [];
  if (status === 'ARMAZENADA') {
    filteredNFs = filteredNFs.filter((nf: any) => 
      !nf.status_separacao || 
      (nf.status_separacao !== 'em_viagem' && nf.status_separacao !== 'entregue')
    );
    log(`🔍 Filtradas ${(nfs || []).length - filteredNFs.length} NFs em viagem/entregues do status ARMAZENADA`);
  }

  // Para cada NF, buscar dados de solicitação
  const nfsWithSolicitacao = await Promise.all(filteredNFs.map(async (nf: any) => {
    // Buscar solicitação mais recente desta NF usando any para contornar tipos
    const { data: solicitacoes } = await (supabase as any)
      .from('solicitacoes_carregamento')
      .select('data_agendamento, observacoes, anexos, requested_at, approved_at, status')
      .eq('nf_id', nf.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const solicitacao = solicitacoes?.[0];
    
    // Log debug para NFs confirmadas
    if (status === 'CONFIRMADA') {
      log(`🔍 [CONFIRMADA] NF ${nf.numero_nf} - Solicitação encontrada:`, {
        nf_id: nf.id,
        status: nf.status,
        tem_solicitacao: !!solicitacao,
        data_agendamento: solicitacao?.data_agendamento,
        observacoes: solicitacao?.observacoes,
        anexos_count: solicitacao?.anexos?.length || 0,
        anexos_preview: solicitacao?.anexos?.slice(0, 2),
        anexos_raw: solicitacao?.anexos
      });
    }
    
    // Garantir que anexos estejam no formato correto para o NFCard
    let documentosAnexos = [];
    if (solicitacao?.anexos) {
      if (Array.isArray(solicitacao.anexos)) {
        documentosAnexos = solicitacao.anexos;
      } else if (typeof solicitacao.anexos === 'string') {
        // Anexos podem vir como string JSON do banco
        try {
          documentosAnexos = JSON.parse(solicitacao.anexos);
        } catch (e) {
          console.warn('Erro ao parsear anexos:', e);
          documentosAnexos = [];
        }
      }
    }
    
    return {
      ...nf,
      status: nf.status as NFStatus,
      status_separacao: nf.status_separacao || 'pendente',
      // Mapear dados da solicitação se existir
      data_agendamento_entrega: solicitacao?.data_agendamento,
      observacoes_solicitacao: solicitacao?.observacoes,
      documentos_anexos: documentosAnexos,
      // Usar dados da solicitação se existir, senão usar dados da NF
      requested_at: solicitacao?.requested_at || nf.requested_at,
      approved_at: solicitacao?.approved_at || nf.approved_at
    };
  }));
  
  log(`📊 Encontradas ${nfsWithSolicitacao?.length || 0} NFs com status ${status || 'todos'}`);
  
  // Log para debug - mostrar se as informações de agendamento estão chegando
  const nfsComAgendamento = nfsWithSolicitacao.filter(nf => nf.data_agendamento_entrega || nf.observacoes_solicitacao || nf.documentos_anexos?.length > 0);
  log(`📋 ${nfsComAgendamento.length} NFs têm informações de agendamento`);
  
  if (nfsComAgendamento.length > 0) {
    log('📋 Exemplo de NF com agendamento:', {
      numero_nf: nfsComAgendamento[0].numero_nf,
      data_agendamento: nfsComAgendamento[0].data_agendamento_entrega,
      observacoes: !!nfsComAgendamento[0].observacoes_solicitacao,
      documentos: nfsComAgendamento[0].documentos_anexos?.length
    });
  }
  
  return nfsWithSolicitacao;
}

export async function solicitarCarregamentoComAgendamento({
  nfId,
  dataAgendamento,
  observacoes,
  anexos
}: {
  nfId: string;
  dataAgendamento?: string; // ISO
  observacoes?: string;
  anexos?: Array<{ name: string; path: string; size?: number; contentType?: string }>;
}): Promise<string> {
  // Usar any para contornar limitação de tipos do Supabase
  const { data, error } = await (supabase as any).rpc('nf_solicitar_agendamento', {
    p_nf_id: nfId,
    p_data_agendamento: dataAgendamento ? new Date(dataAgendamento).toISOString() : null,
    p_observacoes: observacoes ?? null,
    p_anexos: anexos ?? []
  });

  if (error) {
    auditError('SC_CREATE_FAIL', 'SOLICITACAO', error, { nfId });
    throw error;
  }
  
  audit('SC_CREATE', 'SOLICITACAO', { nfId, dataAgendamento, anexosCount: anexos?.length ?? 0 });
  return data as string; // solicitacao_id
}

// Função para upload de anexos
export async function uploadAnexoSolicitacao(
  clienteId: string,
  nfId: string,
  file: File
): Promise<{ name: string; path: string; size: number; contentType: string }> {
  const path = `${clienteId}/${nfId}/${Date.now()}_${file.name}`;
  
  const { error } = await supabase.storage
    .from('solicitacoes-anexos')
    .upload(path, file, { contentType: file.type });
    
  if (error) {
    auditError('SC_UPLOAD_FAIL', 'STORAGE', error, { clienteId, nfId, fileName: file.name });
    throw error;
  }
  
  audit('SC_UPLOAD', 'STORAGE', { clienteId, nfId, fileName: file.name, path });
  
  return {
    name: file.name,
    path,
    size: file.size,
    contentType: file.type
  };
}

// Função para baixar URL assinada do anexo
export async function deleteNF(nfId: string): Promise<void> {
  const userId = await getCurrentUserId();
  log('🗑️ Excluindo NF:', { nfId, userId });
  
  // Handle legacy IDs by stripping the "legacy-" prefix for database operations
  const cleanNfId = nfId.startsWith('legacy-') ? nfId.replace('legacy-', '') : nfId;
  log('🔧 ID processado para exclusão:', { originalId: nfId, cleanId: cleanNfId });
  
  // First verify the NF exists and user has permission
  const { data: nfData, error: fetchError } = await supabase
    .from('notas_fiscais')
    .select('id, numero_nf, status, cliente_id, transportadora_id')
    .eq('id', cleanNfId)
    .single();
    
  if (fetchError || !nfData) {
    const error = fetchError || new Error('NF não encontrada');
    auditError('NF_DELETE_FAIL', 'NF', error, { nfId, cleanNfId, userId, step: 'fetch_verification' });
    throw new Error(`Nota fiscal não encontrada: ${cleanNfId}`);
  }
  
  log('🔍 NF encontrada para exclusão:', { 
    numero_nf: nfData.numero_nf, 
    status: nfData.status,
    transportadora_id: nfData.transportadora_id 
  });
  
  const { error: rpcError } = await (supabase as any).rpc("nf_delete", { 
    p_nf_id: cleanNfId, 
    p_user_id: userId 
  });
  
  if (rpcError) {
    auditError('NF_DELETE_FAIL', 'NF', rpcError, { 
      nfId, 
      cleanNfId, 
      userId, 
      nfData,
      step: 'rpc_execution',
      rpcErrorCode: rpcError.code,
      rpcErrorMessage: rpcError.message,
      rpcErrorDetails: rpcError.details
    });
    throw new Error(`Erro ao excluir nota fiscal: ${rpcError.message}`);
  }
  
  audit('NF_DELETED', 'NF', { nfId, cleanNfId, userId, numero_nf: nfData.numero_nf });
  log('✅ NF excluída com sucesso:', { numero_nf: nfData.numero_nf });
}

export async function getAnexoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('solicitacoes-anexos')
    .createSignedUrl(path, 60 * 60); // 1h
    
  if (error) {
    auditError('SC_DOWNLOAD_FAIL', 'STORAGE', error, { path });
    throw error;
  }
  
  return data.signedUrl;
}