export type NFStatus = "ARMAZENADA" | "SOLICITADA" | "CONFIRMADA";

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