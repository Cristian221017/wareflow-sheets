export interface DocumentoFinanceiro {
  id: string;
  transportadoraId: string;
  clienteId: string;
  numeroCte: string;
  dataVencimento: string;
  valor?: number;
  status: 'Em aberto' | 'Pago' | 'Vencido';
  observacoes?: string;
  arquivoBoletoPath?: string;
  arquivoCtePath?: string;
  dataPagamento?: string;
  pagoEm?: string; // Nova coluna
  valorPago?: number; // Nova coluna
  createdAt: string;
  updatedAt: string;
  // Campos expandidos para joins
  cliente?: {
    razao_social: string;
    nome_fantasia?: string;
  };
}

export interface DocumentoFinanceiroFormData {
  numeroCte: string;
  dataVencimento: string;
  valor?: number;
  clienteId: string;
  observacoes?: string;
  status?: 'Em aberto' | 'Pago' | 'Vencido';
  dataPagamento?: string;
}

export interface FileUploadData {
  file: File;
  type: 'boleto' | 'cte';
  numeroCte: string;
}