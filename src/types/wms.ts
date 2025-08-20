export interface NotaFiscal {
  id: string;
  numeroNF: string;
  numeroPedido: string;
  ordemCompra: string;
  dataRecebimento: string;
  fornecedor: string;
  cnpj: string;
  clienteId?: string; // Add clienteId for proper client identification
  cliente: string;
  cnpjCliente: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  localizacao: string;
  status: 'Armazenada' | 'Ordem Solicitada' | 'Solicitação Confirmada';
  createdAt: string;
}

export interface PedidoLiberacao {
  id: string;
  numeroPedido: string;
  ordemCompra: string;
  dataSolicitacao: string;
  cliente: string;
  cnpjCliente: string;
  nfVinculada: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  responsavel: string;
  status: 'Em análise' | 'Confirmado';
  createdAt: string;
}

export interface PedidoLiberado {
  id: string;
  numeroPedido: string;
  ordemCompra: string;
  dataLiberacao: string;
  cliente: string;
  nfVinculada: string;
  quantidade: number;
  peso: number;
  volume: number;
  transportadora: string;
  dataExpedicao?: string;
  createdAt: string;
}

export interface DashboardData {
  totalNFsArmazenadas: number;
  totalPedidosPendentes: number;
  totalPedidosLiberados: number;
  slaLiberacao: number;
}

export interface FilterOptions {
  cliente?: string;
  periodo?: string;
  prioridade?: string;
  status?: string;
}