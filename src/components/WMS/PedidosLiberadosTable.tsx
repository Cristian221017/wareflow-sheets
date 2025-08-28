import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWMS } from '@/contexts/WMSContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Truck, Trash2, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

export function PedidosLiberadosTable() {
  const { pedidosLiberados, deletePedidoLiberado } = useWMS();

  // Função para imprimir relatório
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');

    const totalPeso = pedidosLiberados.reduce((sum, pedido) => sum + Number(pedido.peso || 0), 0);
    const totalVolume = pedidosLiberados.reduce((sum, pedido) => sum + Number(pedido.volume || 0), 0);
    const totalQuantidade = pedidosLiberados.reduce((sum, pedido) => sum + Number(pedido.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Pedidos Liberados</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Pedidos Liberados</h1>
            <p>Gerado em: ${dataHoraImpressao}</p>
          </div>

          <div class="summary">
            <h3>Resumo</h3>
            <p><strong>Total de pedidos liberados:</strong> ${pedidosLiberados.length}</p>
            <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
            <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
            <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Ordem Compra</th>
                <th>Data Confirmação</th>
                <th>Cliente</th>
                <th>NF Vinculada</th>
                <th>Quantidade</th>
                <th>Peso (kg)</th>
                <th>Volume (m³)</th>
                <th>Transportadora</th>
                <th>Data Expedição</th>
              </tr>
            </thead>
            <tbody>
    `;

    pedidosLiberados.forEach(pedido => {
      html += `
        <tr>
          <td>${pedido.numeroPedido}</td>
          <td>${pedido.ordemCompra}</td>
          <td>${new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}</td>
          <td>${pedido.cliente}</td>
          <td>${pedido.nfVinculada}</td>
          <td>${Number(pedido.quantidade).toLocaleString('pt-BR')}</td>
          <td>${Number(pedido.peso).toLocaleString('pt-BR')}</td>
          <td>${Number(pedido.volume).toLocaleString('pt-BR')}</td>
          <td>${pedido.transportadora}</td>
          <td>${pedido.dataExpedicao ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR') : 'Não informado'}</td>
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
      'Nº Pedido', 'Ordem Compra', 'Data Confirmação', 'Cliente', 'NF Vinculada',
      'Quantidade', 'Peso (kg)', 'Volume (m³)', 'Transportadora', 'Data Expedição'
    ];
    
    const csvContent = [
      headers.join(','),
      ...pedidosLiberados.map(pedido => [
        pedido.numeroPedido,
        pedido.ordemCompra,
        new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR'),
        `"${pedido.cliente}"`,
        pedido.nfVinculada,
        pedido.quantidade,
        pedido.peso,
        pedido.volume,
        `"${pedido.transportadora}"`,
        pedido.dataExpedicao ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR') : 'Não informado'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos-liberados-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  const handleDelete = async (pedidoId: string, numeroPedido: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o pedido liberado ${numeroPedido}? Esta ação não pode ser desfeita.`)) {
      try {
        await deletePedidoLiberado(pedidoId);
      } catch (error) {
        toast.error('Erro ao excluir pedido liberado');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Solicitação Confirmada
          </div>
          {pedidosLiberados.length > 0 && (
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
          Histórico de solicitações confirmadas e expedidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Data Confirmação</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>NF Vinculada</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Transportadora</TableHead>
                 <TableHead>Data Expedição</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosLiberados.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                  <TableCell>{pedido.ordemCompra}</TableCell>
                  <TableCell>{new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.nfVinculada}</TableCell>
                  <TableCell>{pedido.quantidade}</TableCell>
                  <TableCell>{pedido.peso.toFixed(1)}</TableCell>
                  <TableCell>{pedido.volume.toFixed(2)}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    {pedido.transportadora}
                  </TableCell>
                  <TableCell>
                    {pedido.dataExpedicao 
                      ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR')
                      : 'Não informado'
                    }
                  </TableCell>
                   <TableCell>
                     <Badge className="bg-success text-success-foreground">
                       <CheckCircle className="w-3 h-3 mr-1" />
                       Confirmado
                     </Badge>
                   </TableCell>
                   <TableCell>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handleDelete(pedido.id, pedido.numeroPedido)}
                       className="text-destructive hover:text-destructive"
                       title="Excluir pedido liberado"
                     >
                       <Trash2 className="w-3 h-3" />
                     </Button>
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