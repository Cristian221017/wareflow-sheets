import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Tipo temporário para solicitações de carregamento
interface SolicitacaoCarregamento {
  id: string;
  nfVinculada: string;
  numeroPedido: string;
  ordemCompra: string;
  cliente: string;
  produto: string;
  quantidade: number;
  peso: number;
  volume: number;
  dataSolicitacao: string;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada';
  prioridade: 'Alta' | 'Média' | 'Baixa';
}

export function SolicitacoesPendentesTable() {
  // Dados temporários para demonstração
  const [solicitacoes] = useState<SolicitacaoCarregamento[]>([
    {
      id: '1',
      nfVinculada: 'NF-2024-001',
      numeroPedido: 'PED-001',
      ordemCompra: 'OC-2024-001',
      cliente: 'Premium Corp',
      produto: 'Produtos Eletrônicos',
      quantidade: 100,
      peso: 50.5,
      volume: 2.5,
      dataSolicitacao: '2024-01-15',
      status: 'Pendente',
      prioridade: 'Alta'
    }
  ]);

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta':
        return 'bg-destructive text-destructive-foreground';
      case 'Média':
        return 'bg-warning text-warning-foreground';
      case 'Baixa':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleAprovar = (solicitacao: SolicitacaoCarregamento) => {
    toast.success(`Solicitação de carregamento aprovada para NF: ${solicitacao.nfVinculada}`);
    // Aqui implementaremos a lógica de aprovação
  };

  const handleRejeitar = (solicitacao: SolicitacaoCarregamento) => {
    toast.error(`Solicitação de carregamento rejeitada para NF: ${solicitacao.nfVinculada}`);
    // Aqui implementaremos a lógica de rejeição
  };

  const solicitacoesPendentes = solicitacoes.filter(s => s.status === 'Pendente');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Solicitações Pendentes
        </CardTitle>
        <CardDescription>
          Solicitações de carregamento enviadas pelos clientes aguardando aprovação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF Vinculada</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoesPendentes.map((solicitacao) => (
                <TableRow key={solicitacao.id}>
                  <TableCell className="font-medium">{solicitacao.nfVinculada}</TableCell>
                  <TableCell>{solicitacao.numeroPedido}</TableCell>
                  <TableCell>{solicitacao.ordemCompra}</TableCell>
                  <TableCell>{solicitacao.cliente}</TableCell>
                  <TableCell>{solicitacao.produto}</TableCell>
                  <TableCell>{solicitacao.quantidade}</TableCell>
                  <TableCell>{solicitacao.peso.toFixed(1)}</TableCell>
                  <TableCell>{solicitacao.volume.toFixed(2)}</TableCell>
                  <TableCell>{new Date(solicitacao.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(solicitacao.prioridade)}>
                      {solicitacao.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAprovar(solicitacao)}
                        className="text-success border-success hover:bg-success hover:text-success-foreground"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejeitar(solicitacao)}
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {solicitacoesPendentes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de carregamento pendente</p>
            <p className="text-sm mt-1">As solicitações dos clientes aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}