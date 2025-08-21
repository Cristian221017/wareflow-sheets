import { supabase } from "@/integrations/supabase/client";
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
  console.log('🚚 Solicitando carregamento NF:', { nfId, userId });
  
  const { error } = await supabase.rpc("nf_solicitar", { 
    p_nf_id: nfId, 
    p_user: userId 
  });
  
  if (error) {
    console.error('❌ Erro ao solicitar NF:', error);
    throw new Error(`Erro ao solicitar carregamento: ${error.message}`);
  }
  
  console.log('✅ NF solicitada com sucesso');
}

export async function confirmarNF(nfId: string): Promise<void> {
  const userId = await getCurrentUserId();
  console.log('✅ Confirmando carregamento NF:', { nfId, userId });
  
  const { error } = await supabase.rpc("nf_confirmar", { 
    p_nf_id: nfId, 
    p_user: userId 
  });
  
  if (error) {
    console.error('❌ Erro ao confirmar NF:', error);
    throw new Error(`Erro ao confirmar carregamento: ${error.message}`);
  }
  
  console.log('✅ NF confirmada com sucesso');
}

export async function recusarNF(nfId: string): Promise<void> {
  const userId = await getCurrentUserId();
  console.log('❌ Recusando carregamento NF:', { nfId, userId });
  
  const { error } = await supabase.rpc("nf_recusar", { 
    p_nf_id: nfId, 
    p_user: userId 
  });
  
  if (error) {
    console.error('❌ Erro ao recusar NF:', error);
    throw new Error(`Erro ao recusar carregamento: ${error.message}`);
  }
  
  console.log('✅ NF recusada com sucesso');
}

export async function fetchNFsByStatus(status: NFStatus) {
  console.log('📋 Buscando NFs com status:', status);
  
  const { data, error } = await supabase
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
      requested_by,
      requested_at,
      approved_by,
      approved_at,
      created_at,
      updated_at
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error('❌ Erro ao buscar NFs:', error);
    throw new Error(`Erro ao buscar notas fiscais: ${error.message}`);
  }
  
  console.log(`📊 Encontradas ${data?.length || 0} NFs com status ${status}`);
  return data || [];
}