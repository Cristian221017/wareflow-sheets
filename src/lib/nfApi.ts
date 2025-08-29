import { supabase } from "@/integrations/supabase/client";
import { log, warn, error, audit, auditError } from "@/utils/logger";
import type { NFStatus } from "@/types/nf";

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('Usuário não autenticado');
  }
  return data.user.id;
}

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
  
  // Se há dados de agendamento, atualizar a NF com essas informações
  if (dadosAgendamento && (dadosAgendamento.dataAgendamento || dadosAgendamento.observacoes || dadosAgendamento.documentos)) {
    const updateData: any = {};
    
    if (dadosAgendamento.dataAgendamento) {
      updateData.data_agendamento_entrega = dadosAgendamento.dataAgendamento;
    }
    
    if (dadosAgendamento.observacoes) {
      updateData.observacoes_solicitacao = dadosAgendamento.observacoes;
    }
    
    if (dadosAgendamento.documentos && dadosAgendamento.documentos.length > 0) {
      updateData.documentos_anexos = dadosAgendamento.documentos;
    }
    
    const { error: updateError } = await supabase
      .from('notas_fiscais')
      .update(updateData)
      .eq('id', nfId);
    
    if (updateError) {
      auditError('NF_UPDATE_AGENDAMENTO_FAIL', 'NF', updateError, { nfId, userId, dadosAgendamento });
      warn('⚠️ NF solicitada mas dados de agendamento não foram salvos:', updateError.message);
    } else {
      log('📅 Dados de agendamento salvos com sucesso');
    }
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

export async function fetchNFsByStatus(status: NFStatus) {
  log('📋 Buscando NFs com status:', status);
  
  // Primeiro, verificar se o usuário está autenticado e obter informações
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser.user?.id) {
    throw new Error('Usuário não autenticado');
  }

  let query = supabase
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
      approved_at,
      solicitacoes_carregamento(
        id, status, requested_at, data_agendamento, observacoes, anexos
      )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  // Se for um usuário cliente, filtrar apenas suas NFs através do RLS
  // O RLS já deve estar configurado para isso, mas vamos garantir que funcione
  const { data, error: fetchError } = await query;
  
  if (fetchError) {
    auditError('NF_FETCH_BY_STATUS_FAIL', 'NF', fetchError, { status, userId: authUser.user.id });
    throw new Error(`Erro ao buscar notas fiscais: ${fetchError.message}`);
  }
  
  log(`📊 Encontradas ${data?.length || 0} NFs com status ${status}`);
  
  // Mapear dados para incluir informações das solicitações na NF (igual ao useNFsCliente)
  return (data || []).map((item: any) => {
    const nf = { ...item };
    const solicitacao = item.solicitacoes_carregamento?.[0];
    
    if (solicitacao) {
      nf.data_agendamento_entrega = solicitacao.data_agendamento;
      nf.observacoes_solicitacao = solicitacao.observacoes;
      nf.documentos_anexos = solicitacao.anexos;
      nf.requested_at = solicitacao.requested_at;
      nf.approved_at = solicitacao.approved_at;
    }
    
    // Remover array de solicitações do objeto final
    delete nf.solicitacoes_carregamento;
    
    return {
      ...nf,
      status: nf.status as NFStatus,
      status_separacao: nf.status_separacao || 'pendente'
    };
  });
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