import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Trash2, Printer, Download } from 'lucide-react';
import { useWMS } from '@/contexts/WMSContext';
import type { PedidoLiberacao } from '@/types/wms';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { NFFilters, type NFFilterState } from '@/components/NfLists/NFFilters';
import { toast } from 'sonner';

const getPrioridadeColor = (prioridade: string) => {
  switch (prioridade) {
    case 'Alta':
      return 'bg-destructive text-destructive-foreground';
    case 'Média':
      return 'bg-warning text-warning-foreground';
    case 'Baixa':
      return 'bg-success text-success-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function PedidosLiberacaoTable() {
  const { pedidosLiberacao, liberarPedido, deletePedidoLiberacao } = useWMS();
  const [selectedPedido, setSelectedPedido] = useState<PedidoLiberacao | null>(null);
  const [solicitanteLiberacao, setSolicitanteLiberacao] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = useState<NFFilterState>({
    searchNF: '',
    searchPedido: '',
    cliente: 'all',
    produto: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    localizacao: '',
    statusSeparacao: 'all',
  });

  // Função para filtrar pedidos
  const applyFilters = (pedidos: PedidoLiberacao[]) => {
    return pedidos.filter(pedido => {
      if (filters.searchPedido && !pedido.numeroPedido.toLowerCase().includes(filters.searchPedido.toLowerCase())) {
        return false;
      }
      if (filters.produto && !pedido.produto.toLowerCase().includes(filters.produto.toLowerCase())) {
        return false;
      }
      if (filters.dataInicio) {
        const pedidoDate = new Date(pedido.dataSolicitacao);
        const startDate = new Date(filters.dataInicio);
        if (pedidoDate < startDate) return false;
      }
      if (filters.dataFim) {
        const pedidoDate = new Date(pedido.dataSolicitacao);
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        if (pedidoDate > endDate) return false;
      }
      return true;
    });
  };

  const filteredPedidos = applyFilters(pedidosLiberacao);

  // Função para imprimir relatório (atualizada para usar filtros)
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');
    
    const filtrosAplicados = [];
    if (filters.searchPedido) filtrosAplicados.push(`Pedido: ${filters.searchPedido}`);
    if (filters.produto) filtrosAplicados.push(`Produto: ${filters.produto}`);
    if (filters.dataInicio) filtrosAplicados.push(`Data início: ${new Date(filters.dataInicio).toLocaleDateString('pt-BR')}`);
    if (filters.dataFim) filtrosAplicados.push(`Data fim: ${new Date(filters.dataFim).toLocaleDateString('pt-BR')}`);

    const totalPeso = filteredPedidos.reduce((sum, pedido) => sum + Number(pedido.peso || 0), 0);
    const totalVolume = filteredPedidos.reduce((sum, pedido) => sum + Number(pedido.volume || 0), 0);
    const totalQuantidade = filteredPedidos.reduce((sum, pedido) => sum + Number(pedido.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Pedidos Pendentes de Liberação</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .filters { margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
            .summary { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            .prioridade-alta { background-color: #fee2e2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Pedidos Pendentes de Liberação</h1>
            <p>Gerado em: ${dataHoraImpressao}</p>
          </div>
    `;

    if (filtrosAplicados.length > 0) {
      html += `
        <div class="filters">
          <strong>Filtros aplicados:</strong> ${filtrosAplicados.join(', ')}
        </div>
      `;
    }

    html += `
      <div class="summary">
        <h3>Resumo</h3>
        <p><strong>Total de pedidos pendentes:</strong> ${filteredPedidos.length}</p>
        <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
        <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
        <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Ordem Compra</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Peso (kg)</th>
            <th>Volume (m³)</th>
            <th>Prioridade</th>
            <th>Responsável</th>
            <th>Data Solicitação</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredPedidos.forEach(pedido => {
      const classPrioridade = pedido.prioridade === 'Alta' ? 'prioridade-alta' : '';
      html += `
        <tr class="${classPrioridade}">
          <td>${pedido.numeroPedido}</td>
          <td>${pedido.ordemCompra}</td>
          <td>${pedido.produto}</td>
          <td>${Number(pedido.quantidade).toLocaleString('pt-BR')}</td>
          <td>${Number(pedido.peso).toLocaleString('pt-BR')}</td>
          <td>${Number(pedido.volume).toLocaleString('pt-BR')}</td>
          <td>${pedido.prioridade}</td>
          <td>${pedido.responsavel}</td>
          <td>${new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</td>
          <td>${pedido.status}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="footer">
        <p>Relatório gerado pelo Sistema WMS - Pedidos de Liberação</p>
      </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast.success("Relatório enviado para impressão!");
  };

  // Função para exportar CSV (atualizada para usar filtros)
  const handleExportar = () => {
    const headers = [
      'Nº Pedido', 'Ordem Compra', 'Produto', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Prioridade', 'Responsável', 'Data Solicitação', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredPedidos.map(pedido => [
        pedido.numeroPedido,
        pedido.ordemCompra,
        `"${pedido.produto}"`,
        pedido.quantidade,
        pedido.peso,
        pedido.volume,
        pedido.prioridade,
        `"${pedido.responsavel}"`,
        new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR'),
        pedido.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos-pendentes-liberacao-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  const handleLiberarPedido = async () => {
    if (!selectedPedido) return;

    try {
      await liberarPedido(selectedPedido.id, solicitanteLiberacao);
      setIsDialogOpen(false);
      setSelectedPedido(null);
      setSolicitanteLiberacao('');
      setDataExpedicao('');
      toast.success("Pedido liberado com sucesso!");
    } catch (error) {
      toast.error('Erro ao liberar pedido');
    }
  };

  const handleDeletePedido = async (pedido: PedidoLiberacao) => {
    if (confirm(`Tem certeza que deseja excluir o pedido ${pedido.numeroPedido}?`)) {
      try {
        await deletePedidoLiberacao(pedido.id);
        toast.success("Pedido excluído com sucesso!");
      } catch (error) {
        toast.error('Erro ao excluir pedido de liberação');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <NFFilters
        filters={filters}
        onFiltersChange={setFilters}
        showClientFilter={false}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ordem de Carregamento</CardTitle>
              <CardDescription>
                Pedidos aguardando análise e liberação ({filteredPedidos.length}
                {pedidosLiberacao.length !== filteredPedidos.length && ` de ${pedidosLiberacao.length}`} itens)
              </CardDescription>
            </div>
            {filteredPedidos.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handleImprimir} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={handleExportar} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredPedidos.length > 0 ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Ordem Compra</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>NF Vinculada</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Volume (m³)</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                      <TableCell>{pedido.ordemCompra}</TableCell>
                      <TableCell>{new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>{pedido.cnpjCliente}</TableCell>
                      <TableCell>{pedido.nfVinculada}</TableCell>
                      <TableCell>{pedido.produto}</TableCell>
                      <TableCell>{pedido.quantidade}</TableCell>
                      <TableCell>{Number(pedido.peso || 0).toFixed(1)}</TableCell>
                      <TableCell>{Number(pedido.volume || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getPrioridadeColor(pedido.prioridade)}>
                          {pedido.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>{pedido.responsavel}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedPedido(pedido);
                              setIsDialogOpen(true);
                            }}
                            size="sm"
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Liberar
                          </Button>
                          <Button
                            onClick={() => handleDeletePedido(pedido)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : pedidosLiberacao.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido encontrado com os filtros aplicados</p>
              <p className="text-sm mt-1">Tente ajustar os filtros para ver mais resultados</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido de liberação pendente</p>
              <p className="text-sm mt-1">Os pedidos pendentes aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para liberação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar Pedido</DialogTitle>
            <DialogDescription>
              Confirme os dados para liberar o pedido {selectedPedido?.numeroPedido}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="solicitante">Solicitante da Liberação</Label>
              <Input
                id="solicitante"
                value={solicitanteLiberacao}
                onChange={(e) => setSolicitanteLiberacao(e.target.value)}
                placeholder="Nome do solicitante"
              />
            </div>
            <div>
              <Label htmlFor="data-expedicao">Data de Expedição</Label>
              <Input
                id="data-expedicao"
                type="date"
                value={dataExpedicao}
                onChange={(e) => setDataExpedicao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLiberarPedido}>
              Liberar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}