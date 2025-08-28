import { useState } from 'react';
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
import { NFFilters, type NFFilterState } from '@/components/NfLists/NFFilters';
import { toast } from 'sonner';
import type { PedidoLiberado } from '@/types/wms';

export function PedidosLiberadosTable() {
  const { pedidosLiberados, deletePedidoLiberado } = useWMS();
  
  // Estados para filtros
  const [filters, setFilters] = useState<NFFilterState>({
    searchNF: '',
    searchPedido: '',
    cliente: '',
    produto: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    localizacao: '',
  });

  // Função para filtrar pedidos
  const applyFilters = (pedidos: PedidoLiberado[]) => {
    return pedidos.filter(pedido => {
      if (filters.searchPedido && !pedido.numeroPedido.toLowerCase().includes(filters.searchPedido.toLowerCase())) {
        return false;
      }
      if (filters.cliente && !pedido.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) {
        return false;
      }
      if (filters.dataInicio) {
        const pedidoDate = new Date(pedido.dataLiberacao);
        const startDate = new Date(filters.dataInicio);
        if (pedidoDate < startDate) return false;
      }
      if (filters.dataFim) {
        const pedidoDate = new Date(pedido.dataLiberacao);
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        if (pedidoDate > endDate) return false;
      }
      return true;
    });
  };

  const filteredPedidos = applyFilters(pedidosLiberados);

  // Função para imprimir relatório (atualizada para usar filtros)
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');
    
    const filtrosAplicados = [];
    if (filters.searchPedido) filtrosAplicados.push(`Pedido: ${filters.searchPedido}`);
    if (filters.cliente) filtrosAplicados.push(`Cliente: ${filters.cliente}`);
    if (filters.dataInicio) filtrosAplicados.push(`Data início: ${new Date(filters.dataInicio).toLocaleDateString('pt-BR')}`);
    if (filters.dataFim) filtrosAplicados.push(`Data fim: ${new Date(filters.dataFim).toLocaleDateString('pt-BR')}`);

    const totalPeso = filteredPedidos.reduce((sum, pedido) => sum + Number(pedido.peso || 0), 0);
    const totalVolume = filteredPedidos.reduce((sum, pedido) => sum + Number(pedido.volume || 0), 0);
    const totalQuantidade = filteredPedidos.reduce((sum, pedido) => sum + Number(pedido.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Pedidos Liberados</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .filters { margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
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
        <p><strong>Total de pedidos liberados:</strong> ${filteredPedidos.length}</p>
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

    filteredPedidos.forEach(pedido => {
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

  // Função para exportar CSV (atualizada para usar filtros)
  const handleExportar = () => {
    const headers = [
      'Nº Pedido', 'Ordem Compra', 'Data Confirmação', 'Cliente', 'NF Vinculada',
      'Quantidade', 'Peso (kg)', 'Volume (m³)', 'Transportadora', 'Data Expedição'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredPedidos.map(pedido => [
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
        toast.success("Pedido excluído com sucesso!");
      } catch (error) {
        toast.error('Erro ao excluir pedido liberado');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <NFFilters
        filters={filters}
        onFiltersChange={setFilters}
        showClientFilter={true}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Solicitação Confirmada
              </CardTitle>
              <CardDescription>
                Histórico de solicitações confirmadas e expedidas ({filteredPedidos.length}
                {pedidosLiberados.length !== filteredPedidos.length && ` de ${pedidosLiberados.length}`} itens)
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
                  {filteredPedidos.map((pedido) => (
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
          ) : pedidosLiberados.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido encontrado com os filtros aplicados</p>
              <p className="text-sm mt-1">Tente ajustar os filtros para ver mais resultados</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido liberado</p>
              <p className="text-sm mt-1">Os pedidos liberados aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}