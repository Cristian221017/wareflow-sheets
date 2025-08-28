import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNFs } from '@/hooks/useNFs';
import { NFCard } from '@/components/NfLists/NFCard';
import { CheckCircle, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

export function PedidosConfirmadosTransportadora() {
  const { data: confirmadas, isLoading } = useNFs("CONFIRMADA");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Carregando pedidos confirmados...</p>
        </CardContent>
      </Card>
    );
  }

  const validConfirmadas = confirmadas || [];

  // Função para imprimir relatório
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');
    
    const totalPeso = validConfirmadas.reduce((sum, nf) => sum + Number(nf.peso || 0), 0);
    const totalVolume = validConfirmadas.reduce((sum, nf) => sum + Number(nf.volume || 0), 0);
    const totalQuantidade = validConfirmadas.reduce((sum, nf) => sum + Number(nf.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Carregamentos Confirmados - Transportadora</title>
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
            <h1>Relatório de Carregamentos Confirmados</h1>
            <p>Portal da Transportadora</p>
            <p>Gerado em: ${dataHoraImpressao}</p>
          </div>
          
          <div class="summary">
            <h3>Resumo</h3>
            <p><strong>Total de carregamentos confirmados:</strong> ${validConfirmadas.length}</p>
            <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
            <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
            <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>NF</th>
                <th>Pedido</th>
                <th>Ordem Compra</th>
                <th>Fornecedor</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Peso (kg)</th>
                <th>Volume (m³)</th>
                <th>Data Confirmação</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;

    validConfirmadas.forEach(nf => {
      html += `
        <tr>
          <td>${nf.numero_nf}</td>
          <td>${nf.numero_pedido}</td>
          <td>${nf.ordem_compra}</td>
          <td>${nf.fornecedor}</td>
          <td>${nf.produto}</td>
          <td>${Number(nf.quantidade).toLocaleString('pt-BR')}</td>
          <td>${Number(nf.peso).toLocaleString('pt-BR')}</td>
          <td>${Number(nf.volume).toLocaleString('pt-BR')}</td>
          <td>${new Date(nf.updated_at).toLocaleDateString('pt-BR')}</td>
          <td>${nf.status}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="footer">
        <p>Relatório gerado pelo Sistema WMS - Portal da Transportadora</p>
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
      'NF', 'Pedido', 'Ordem Compra', 'Fornecedor', 'Produto', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Data Confirmação', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...validConfirmadas.map(nf => [
        nf.numero_nf,
        nf.numero_pedido,
        nf.ordem_compra,
        `"${nf.fornecedor}"`,
        `"${nf.produto}"`,
        nf.quantidade,
        nf.peso,
        nf.volume,
        new Date(nf.updated_at).toLocaleDateString('pt-BR'),
        nf.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `carregamentos-confirmados-transportadora-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Carregamentos Confirmados
            </CardTitle>
            <CardDescription>
              Carregamentos aprovados e prontos para retirada ({validConfirmadas.length} itens)
            </CardDescription>
          </div>
          {validConfirmadas.length > 0 && (
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
        {validConfirmadas.length > 0 ? (
          <div className="space-y-3">
            {validConfirmadas.map((nf) => (
              <NFCard
                key={nf.id}
                nf={nf}
                showApprovalInfo
                showSelection={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum carregamento confirmado</p>
            <p className="text-sm mt-1">Os carregamentos aprovados aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}