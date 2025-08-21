// Tipos centralizados para o fluxo de NFs
// IMPORTANTE: Manter consistência exata com enum do banco

export type NFStatus = 'ARMAZENADA' | 'SOLICITADA' | 'CONFIRMADA';

export interface NF {
  id: string;
  numero_nf: string;
  numero_pedido: string;
  ordem_compra: string;
  data_recebimento: string;
  fornecedor: string;
  cnpj_fornecedor: string;
  cliente_id: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  localizacao: string;
  status: NFStatus;
  transportadora_id: string;
  created_at: string;
  updated_at: string;
  
  // Campos de controle de fluxo
  requested_by?: string | null;
  requested_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  
  // Relacionamentos populados via join
  cliente?: {
    razao_social: string;
    cnpj: string;
  } | null;
  requested_by_profile?: {
    name: string;
  } | null;
  approved_by_profile?: {
    name: string;
  } | null;
}

export interface NFFlowAction {
  nfId: string;
  action: 'solicitar' | 'confirmar' | 'recusar';
  userId: string;
  timestamp: Date;
}

// Guard de tipos para validação de status
export const isValidNFStatus = (status: string): status is NFStatus => {
  return ['ARMAZENADA', 'SOLICITADA', 'CONFIRMADA'].includes(status);
};

// Helper para logs de fluxo
export const logFlow = (action: string, nfId: string, status?: NFStatus, error?: string) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[FLOW] ${timestamp} - ${action}`, {
      nfId,
      status,
      error
    });
  }
};