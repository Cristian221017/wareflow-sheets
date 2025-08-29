import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { Printer, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';

export function ImpressaoPedidosLiberados() {
  const { pedidosLiberados } = useWMS();
  const { clientes } = useAuth();
  const [filtroCliente, setFiltroCliente] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTransportadora, setFiltroTransportadora] = useState<string>('');
  const [filtroNumeroPedido, setFiltroNumeroPedido] = useState<string>('');

  const clientesOptions = [
    { value: 'all', label: 'Todos os clientes' },
    ...clientes.map(cliente => ({
      value: cliente.name,
      label: cliente.name
    }))
  ];

  const pedidosFiltrados = pedidosLiberados.filter(pedido => {
    const matchCliente = !filtroCliente || filtroCliente === 'all' || pedido.cliente === filtroCliente;
    const matchDataInicio = !dataInicio || new Date(pedido.dataLiberacao) >= new Date(dataInicio);
    const matchDataFim = !dataFim || new Date(pedido.dataLiberacao) <= new Date(dataFim);
    const matchTransportadora = !filtroTransportadora || pedido.transportadora.toLowerCase().includes(filtroTransportadora.toLowerCase());
    const matchNumeroPedido = !filtroNumeroPedido || pedido.numeroPedido.toLowerCase().includes(filtroNumeroPedido.toLowerCase());
    
    return matchCliente && matchDataInicio && matchDataFim && matchTransportadora && matchNumeroPedido;
  });

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relação de Solicitações Confirmadas</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            .header { margin-bottom: 30px; }
            .filters { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total { margin-top: 20px; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sistema WMS - Relação de Solicitações Confirmadas</h1>
            <p><strong>Data do Relatório:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          
           <div class="filters">
             <h3>Filtros Aplicados:</h3>
             <p><strong>Cliente:</strong> ${filtroCliente && filtroCliente !== 'all' ? filtroCliente : 'Todos os clientes'}</p>
             <p><strong>Período:</strong> ${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : 'Início'} até ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : 'Fim'}</p>
             ${filtroNumeroPedido ? `<p><strong>Número do Pedido:</strong> ${filtroNumeroPedido}</p>` : ''}
             ${filtroTransportadora ? `<p><strong>Transportadora:</strong> ${filtroTransportadora}</p>` : ''}
           </div>

          <table>
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Data Liberação</th>
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
              ${pedidosFiltrados.map(pedido => `
                <tr>
                  <td>${pedido.numeroPedido}</td>
                  <td>${new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}</td>
                  <td>${pedido.cliente}</td>
                  <td>${pedido.nfVinculada}</td>
                  <td>${pedido.quantidade}</td>
                  <td>${(pedido.peso || 0).toFixed(1)}</td>
                  <td>${(pedido.volume || 0).toFixed(2)}</td>
                  <td>${pedido.transportadora}</td>
                  <td>${pedido.dataExpedicao ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR') : 'Não informado'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Total de pedidos: ${pedidosFiltrados.length}</p>
            <p>Peso total: ${pedidosFiltrados.reduce((acc, p) => acc + (p.peso || 0), 0).toFixed(1)} kg</p>
            <p>Volume total: ${pedidosFiltrados.reduce((acc, p) => acc + (p.volume || 0), 0).toFixed(2)} m³</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportar = () => {
    const csvContent = [
      ['Nº Pedido', 'Data Liberação', 'Cliente', 'NF Vinculada', 'Quantidade', 'Peso (kg)', 'Volume (m³)', 'Transportadora', 'Data Expedição'],
      ...pedidosFiltrados.map(pedido => [
        pedido.numeroPedido,
        new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR'),
        pedido.cliente,
        pedido.nfVinculada,
        pedido.quantidade,
        (pedido.peso || 0).toFixed(1),
        (pedido.volume || 0).toFixed(2),
        pedido.transportadora,
        pedido.dataExpedicao ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR') : 'Não informado'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos-liberados-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-primary" />
          Impressão de Solicitações Confirmadas
        </CardTitle>
        <CardDescription>
          Gere relatórios de solicitações confirmadas com filtros personalizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filtros Avançados</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFiltroCliente('all');
                setDataInicio('');
                setDataFim('');
                setFiltroTransportadora('');
                setFiltroNumeroPedido('');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Combobox
                options={clientesOptions}
                value={filtroCliente}
                onValueChange={setFiltroCliente}
                placeholder="Selecione o cliente..."
                searchPlaceholder="Buscar cliente..."
              />
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Número do Pedido</Label>
              <Input
                placeholder="Digite o número do pedido..."
                value={filtroNumeroPedido}
                onChange={(e) => setFiltroNumeroPedido(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Input
                placeholder="Digite o nome da transportadora..."
                value={filtroTransportadora}
                onChange={(e) => setFiltroTransportadora(e.target.value)}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando {pedidosFiltrados.length} de {pedidosLiberados.length} pedidos liberados
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Resumo do Relatório</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total de pedidos:</span>
              <span className="ml-2 font-medium">{pedidosFiltrados.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Peso total:</span>
              <span className="ml-2 font-medium">
                {pedidosFiltrados.reduce((acc, p) => acc + (p.peso || 0), 0).toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Volume total:</span>
              <span className="ml-2 font-medium">
                {pedidosFiltrados.reduce((acc, p) => acc + (p.volume || 0), 0).toFixed(2)} m³
              </span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <Button onClick={handleImprimir} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Relatório
          </Button>
          
          <Button onClick={handleExportar} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}