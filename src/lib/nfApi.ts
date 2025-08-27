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

export async function solicitarNF(nfId: string): Promise<void> {
  const userId = await getCurrentUserId();
  log('🚚 Solicitando carregamento NF:', { nfId, userId });
  
  const { error: rpcError } = await supabase.rpc("nf_solicitar", { 
    p_nf_id: nfId, 
    p_user_id: userId 
  });
  
  if (rpcError) {
    auditError('NF_SOLICITAR_FAIL', 'NF', rpcError, { nfId, userId });
    throw new Error(`Erro ao solicitar carregamento: ${rpcError.message}`);
  }
  
  audit('NF_SOLICITADA', 'NF', { nfId, userId });
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
  log('📋 Buscando NFs da transportadora com status:', status);
  
  const { data, error: fetchError } = await supabase
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
      updated_at
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });
  
  if (fetchError) {
    auditError('NF_FETCH_BY_STATUS_FAIL', 'NF', fetchError, { status });
    throw new Error(`Erro ao buscar notas fiscais: ${fetchError.message}`);
  }
  
  log(`📊 Encontradas ${data?.length || 0} NFs da transportadora com status ${status}`);
  
  // Cast explícito do status para NFStatus e adicionar status_separacao default se não existir
  return (data || []).map((item: any) => ({
    ...item,
    status: item.status as NFStatus,
    status_separacao: item.status_separacao || 'pendente'
  }));
}

export async function fetchNFsCliente(status?: NFStatus) {
  log('🏢 Buscando NFs do cliente (políticas RLS usando user_clientes):', { status });
  
  // Usar query direta - as políticas RLS já garantem que só vê NFs vinculadas
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
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error: fetchError } = await query;
  
  if (fetchError) {
    auditError('NF_FETCH_CLIENTE_FAIL', 'NF', fetchError, { status });
    throw new Error(`Erro ao buscar notas fiscais do cliente: ${fetchError.message}`);
  }
  
  log(`📊 Encontradas ${data?.length || 0} NFs do cliente`, { status });
  
  return (data || []).map((item: any) => ({
    ...item,
    status: item.status as NFStatus,
    status_separacao: item.status_separacao || 'pendente'
  }));
}