import { supabase } from "@/integrations/supabase/client";
import { log, warn, error as logError, audit, auditError } from '@/utils/logger';
import { getCurrentUserId } from '@/utils/authCache';

export async function createDocumentoFinanceiro(
  clienteId: string,
  numeroCte: string,
  dataVencimento: string,
  valor: number,
  observacoes?: string,
  status: string = 'Em aberto'
): Promise<string> {
  log('💰 Criando documento financeiro:', { clienteId, numeroCte, valor });
  
  const { data, error } = await supabase.rpc("financeiro_create_documento" as any, { 
    p_cliente_id: clienteId,
    p_numero_cte: numeroCte,
    p_data_vencimento: dataVencimento,
    p_valor: valor,
    p_observacoes: observacoes,
    p_status: status
  });
  
  if (error) {
    auditError('DOC_CREATE_FAIL', 'FINANCEIRO', error, { clienteId, numeroCte, valor });
    throw new Error(`Erro ao criar documento financeiro: ${error.message}`);
  }
  
  audit('DOC_CREATED', 'FINANCEIRO', { documentoId: data, clienteId, numeroCte, valor });
  log('✅ Documento financeiro criado com sucesso:', data);
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
  log('💰 Atualizando documento financeiro:', { documentoId, updates });
  
  const { error } = await supabase.rpc("financeiro_update_documento" as any, { 
    p_documento_id: documentoId,
    p_status: updates.status,
    p_valor: updates.valor,
    p_observacoes: updates.observacoes,
    p_data_pagamento: updates.dataPagamento
  });
  
  if (error) {
    auditError('DOC_UPDATE_FAIL', 'FINANCEIRO', error, { documentoId, updates });
    throw new Error(`Erro ao atualizar documento financeiro: ${error.message}`);
  }
  
  audit('DOC_UPDATED', 'FINANCEIRO', { documentoId, updates });
  log('✅ Documento financeiro atualizado com sucesso');
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
  log('📦 Criando nota fiscal:', nfData);
  
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
    auditError('NF_CREATE_FAIL', 'NF', error, { numeroNF: nfData.numeroNF, clienteCnpj: nfData.clienteCnpj });
    throw new Error(`Erro ao criar nota fiscal: ${error.message}`);
  }
  
  audit('NF_CREATED', 'NF', { nfId: data, numeroNF: nfData.numeroNF, clienteCnpj: nfData.clienteCnpj });
  log('✅ Nota fiscal criada com sucesso:', data);
  return data as string;
}