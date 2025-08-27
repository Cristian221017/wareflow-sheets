import { supabase } from "@/integrations/supabase/client";

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('Usuário não autenticado');
  }
  return data.user.id;
}

export async function createDocumentoFinanceiro(
  clienteId: string,
  numeroCte: string,
  dataVencimento: string,
  valor: number,
  observacoes?: string,
  status: string = 'Em aberto'
): Promise<string> {
  console.log('💰 Criando documento financeiro:', { clienteId, numeroCte, valor });
  
  const { data, error } = await supabase.rpc("financeiro_create_documento" as any, { 
    p_cliente_id: clienteId,
    p_numero_cte: numeroCte,
    p_data_vencimento: dataVencimento,
    p_valor: valor,
    p_observacoes: observacoes,
    p_status: status
  });
  
  if (error) {
    console.error('❌ Erro ao criar documento financeiro:', error);
    throw new Error(`Erro ao criar documento financeiro: ${error.message}`);
  }
  
  console.log('✅ Documento financeiro criado com sucesso:', data);
  return data as string;
}

export async function updateDocumentoFinanceiro(
  documentoId: string,
  updates: {
    status?: string;
    valor?: number;
    observacoes?: string;
    dataPagamento?: string;
  }
): Promise<void> {
  console.log('💰 Atualizando documento financeiro:', { documentoId, updates });
  
  const { error } = await supabase.rpc("financeiro_update_documento" as any, { 
    p_documento_id: documentoId,
    p_status: updates.status,
    p_valor: updates.valor,
    p_observacoes: updates.observacoes,
    p_data_pagamento: updates.dataPagamento
  });
  
  if (error) {
    console.error('❌ Erro ao atualizar documento financeiro:', error);
    throw new Error(`Erro ao atualizar documento financeiro: ${error.message}`);
  }
  
  console.log('✅ Documento financeiro atualizado com sucesso');
}

export async function createNotaFiscal(nfData: {
  numeroNF: string;
  numeroPedido: string;
  ordemCompra: string;
  dataRecebimento: string;
  fornecedor: string;
  cnpjFornecedor: string;
  clienteCnpj: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  localizacao: string;
}): Promise<string> {
  console.log('📦 Criando nota fiscal:', nfData);
  
  const { data, error } = await supabase.rpc("nf_create" as any, { 
    p_numero_nf: nfData.numeroNF,
    p_numero_pedido: nfData.numeroPedido,
    p_ordem_compra: nfData.ordemCompra,
    p_data_recebimento: nfData.dataRecebimento,
    p_fornecedor: nfData.fornecedor,
    p_cnpj_fornecedor: nfData.cnpjFornecedor,
    p_cliente_cnpj: nfData.clienteCnpj,
    p_produto: nfData.produto,
    p_quantidade: nfData.quantidade,
    p_peso: nfData.peso,
    p_volume: Number(nfData.volume) || 0, // Garantir que nunca seja null/undefined
    p_localizacao: nfData.localizacao || 'A definir'
  });
  
  if (error) {
    console.error('❌ Erro ao criar NF:', error);
    throw new Error(`Erro ao criar nota fiscal: ${error.message}`);
  }
  
  console.log('✅ Nota fiscal criada com sucesso:', data);
  return data as string;
}