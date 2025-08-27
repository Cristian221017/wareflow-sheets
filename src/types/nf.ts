// Status unificado - única fonte da verdade
export const NF_STATUS = ['ARMAZENADA', 'SOLICITADA', 'CONFIRMADA'] as const;
export type NFStatus = typeof NF_STATUS[number];

export interface NotaFiscal {
  id: string;
  numero_nf: string;
  numero_pedido: string;
  ordem_compra: string;
  cliente_id: string;
  transportadora_id: string;
  fornecedor: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  localizacao: string;
  data_recebimento: string;
  status: NFStatus;
  status_separacao?: 'pendente' | 'em_separacao' | 'separacao_concluida' | 'separacao_com_pendencia';
  created_at: string;
  updated_at: string;
  // Campos opcionais que podem não existir ainda
  requested_by?: string | null;
  requested_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface NFTransition {
  nfId: string;
  fromStatus: NFStatus;
  toStatus: NFStatus;
  userId: string;
  timestamp: string;
}