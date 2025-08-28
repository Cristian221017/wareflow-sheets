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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWMS } from '@/contexts/WMSContext';
import { PedidoLiberacao } from '@/types/wms';
import { AlertTriangle, CheckCircle, Trash2, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const getPriorityColor = (prioridade: PedidoLiberacao['prioridade']) => {
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

  // Função para imprimir relatório
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');

    const totalPeso = pedidosLiberacao.reduce((sum, pedido) => sum + Number(pedido.peso || 0), 0);
    const totalVolume = pedidosLiberacao.reduce((sum, pedido) => sum + Number(pedido.volume || 0), 0);
    const totalQuantidade = pedidosLiberacao.reduce((sum, pedido) => sum + Number(pedido.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Pedidos Pendentes de Liberação</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
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

          <div class="summary">
            <h3>Resumo</h3>
            <p><strong>Total de pedidos pendentes:</strong> ${pedidosLiberacao.length}</p>
            <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
            <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
            <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Ordem Compra</th>
                <th>Data Solicitação</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>NF Vinculada</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Peso (kg)</th>
                <th>Volume (m³)</th>
                <th>Prioridade</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
    `;

    pedidosLiberacao.forEach(pedido => {
      const rowClass = pedido.prioridade === 'Alta' ? 'class="prioridade-alta"' : '';
      html += `
        <tr ${rowClass}>
          <td>${pedido.numeroPedido}</td>
          <td>${pedido.ordemCompra}</td>
          <td>${new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</td>
          <td>${pedido.cliente}</td>
          <td>${pedido.cnpjCliente}</td>
          <td>${pedido.nfVinculada}</td>
          <td>${pedido.produto}</td>
          <td>${Number(pedido.quantidade).toLocaleString('pt-BR')}</td>
          <td>${Number(pedido.peso).toLocaleString('pt-BR')}</td>
          <td>${Number(pedido.volume).toLocaleString('pt-BR')}</td>
          <td>${pedido.prioridade}</td>
          <td>${pedido.responsavel}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="footer">
        <p>Relatório gerado pelo Sistema WMS</p>
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

  // Função para exportar CSV
  const handleExportar = () => {
    const headers = [
      'Nº Pedido', 'Ordem Compra', 'Data Solicitação', 'Cliente', 'CNPJ', 'NF Vinculada',
      'Produto', 'Quantidade', 'Peso (kg)', 'Volume (m³)', 'Prioridade', 'Responsável'
    ];
    
    const csvContent = [
      headers.join(','),
      ...pedidosLiberacao.map(pedido => [
        pedido.numeroPedido,
        pedido.ordemCompra,
        new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR'),
        `"${pedido.cliente}"`,
        pedido.cnpjCliente,
        pedido.nfVinculada,
        `"${pedido.produto}"`,
        pedido.quantidade,
        pedido.peso,
        pedido.volume,
        pedido.prioridade,
        `"${pedido.responsavel}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos-liberacao-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  const handleLiberar = () => {
    if (selectedPedido) {
      liberarPedido(selectedPedido.id, solicitanteLiberacao, dataExpedicao || undefined);
      setIsDialogOpen(false);
      setSelectedPedido(null);
      setSolicitanteLiberacao('');
      setDataExpedicao('');
    }
  };

  const handleDelete = async (pedido: PedidoLiberacao) => {
    if (window.confirm(`Tem certeza que deseja excluir o pedido ${pedido.numeroPedido}? Esta ação não pode ser desfeita.`)) {
      try {
        await deletePedidoLiberacao(pedido.id);
      } catch (error) {
        toast.error('Erro ao excluir pedido de liberação');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Ordem de Carregamento</span>
          {pedidosLiberacao.length > 0 && (
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
        </CardTitle>
        <CardDescription>
          Pedidos aguardando análise e liberação
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              {pedidosLiberacao.map((pedido) => (
                <TableRow 
                  key={pedido.id}
                  className={cn(
                    pedido.prioridade === 'Alta' 
                      ? 'bg-destructive/10 hover:bg-destructive/20 border-l-4 border-l-destructive' 
                      : ''
                  )}
                >
                  <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                  <TableCell>{pedido.ordemCompra}</TableCell>
                  <TableCell>{new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.cnpjCliente}</TableCell>
                  <TableCell>{pedido.nfVinculada}</TableCell>
                  <TableCell>{pedido.produto}</TableCell>
                  <TableCell>{pedido.quantidade}</TableCell>
                  <TableCell>{pedido.peso.toFixed(1)}</TableCell>
                  <TableCell>{pedido.volume.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(pedido.prioridade)}>
                      {pedido.prioridade === 'Alta' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {pedido.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>{pedido.responsavel}</TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                         <DialogTrigger asChild>
                           <Button 
                             size="sm" 
                             onClick={() => setSelectedPedido(pedido)}
                             className="bg-success text-success-foreground hover:bg-success/80"
                           >
                             <CheckCircle className="w-4 h-4 mr-1" />
                             Liberar
                           </Button>
                         </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Liberar Pedido</DialogTitle>
                          <DialogDescription>
                            Confirme os dados para liberação do pedido {selectedPedido?.numeroPedido}
                          </DialogDescription>
                        </DialogHeader>
                         <div className="grid gap-4 py-4">
                           <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="solicitanteLiberacao" className="text-right">
                               Solicitante
                             </Label>
                             <Input
                               id="solicitanteLiberacao"
                               value={solicitanteLiberacao}
                               onChange={(e) => setSolicitanteLiberacao(e.target.value)}
                               className="col-span-3"
                               placeholder="Nome do solicitante da liberação"
                             />
                           </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dataExpedicao" className="text-right">
                              Data Expedição
                            </Label>
                            <Input
                              id="dataExpedicao"
                              type="date"
                              value={dataExpedicao}
                              onChange={(e) => setDataExpedicao(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                           <Button 
                             type="submit" 
                             onClick={handleLiberar}
                             disabled={!solicitanteLiberacao}
                             className="bg-success text-success-foreground hover:bg-success/80"
                           >
                            Confirmar Liberação
                          </Button>
                         </DialogFooter>
                       </DialogContent>
                     </Dialog>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handleDelete(pedido)}
                       className="text-destructive hover:text-destructive"
                       title="Excluir pedido"
                     >
                       <Trash2 className="w-3 h-3" />
                     </Button>
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}