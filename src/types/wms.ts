export interface NotaFiscal {
  id: string;
  numeroNF: string;
  dataRecebimento: string;
  fornecedor: string;
  cnpj: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  localizacao: string;
  status: 'Armazenada' | 'Em Separação' | 'Liberada';
  createdAt: string;
}

export interface PedidoLiberacao {
  id: string;
  numeroPedido: string;
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
  status: 'Em análise' | 'Liberado';
  createdAt: string;
}

export interface PedidoLiberado {
  id: string;
  numeroPedido: string;
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