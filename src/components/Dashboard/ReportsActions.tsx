import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import type { NotaFiscal } from "@/types/nf";

interface ReportsActionsProps {
  nfs: NotaFiscal[];
  reportTitle: string;
  fileName: string;
  filters?: Record<string, any>;
}

export function ReportsActions({ 
  nfs, 
  reportTitle, 
  fileName,
  filters = {} 
}: ReportsActionsProps) {
  
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');
    
    const filtrosAplicados = [];
    if (filters.searchNF) filtrosAplicados.push(`NF: ${filters.searchNF}`);
    if (filters.searchPedido) filtrosAplicados.push(`Pedido: ${filters.searchPedido}`);
    if (filters.produto) filtrosAplicados.push(`Produto: ${filters.produto}`);
    if (filters.fornecedor) filtrosAplicados.push(`Fornecedor: ${filters.fornecedor}`);
    if (filters.localizacao) filtrosAplicados.push(`Localização: ${filters.localizacao}`);
    if (filters.dataInicio) filtrosAplicados.push(`Data início: ${new Date(filters.dataInicio).toLocaleDateString('pt-BR')}`);
    if (filters.dataFim) filtrosAplicados.push(`Data fim: ${new Date(filters.dataFim).toLocaleDateString('pt-BR')}`);

    let html = `
      <html>
        <head>
          <title>${reportTitle}</title>
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
            <h1>${reportTitle}</h1>
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

    const totalPeso = nfs.reduce((sum, nf) => sum + Number(nf.peso || 0), 0);
    const totalVolume = nfs.reduce((sum, nf) => sum + Number(nf.volume || 0), 0);
    const totalQuantidade = nfs.reduce((sum, nf) => sum + Number(nf.quantidade || 0), 0);

    html += `
      <div class="summary">
        <h3>Resumo</h3>
        <p><strong>Total de mercadorias:</strong> ${nfs.length}</p>
        <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
        <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
        <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>NF</th>
            <th>Pedido</th>
            <th>Produto</th>
            <th>Fornecedor</th>
            <th>Quantidade</th>
            <th>Peso (kg)</th>
            <th>Volume (m³)</th>
            <th>Localização</th>
            <th>Data Receb.</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    nfs.forEach(nf => {
      html += `
        <tr>
          <td>${nf.numero_nf}</td>
          <td>${nf.numero_pedido}</td>
          <td>${nf.produto}</td>
          <td>${nf.fornecedor}</td>
          <td>${Number(nf.quantidade).toLocaleString('pt-BR')}</td>
          <td>${Number(nf.peso).toLocaleString('pt-BR')}</td>
          <td>${Number(nf.volume).toLocaleString('pt-BR')}</td>
          <td>${nf.localizacao}</td>
          <td>${new Date(nf.data_recebimento).toLocaleDateString('pt-BR')}</td>
          <td>${nf.status}</td>
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

  const handleExportar = () => {
    const headers = [
      'NF', 'Pedido', 'Produto', 'Fornecedor', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Localização', 'Data Recebimento', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...nfs.map(nf => [
        nf.numero_nf,
        nf.numero_pedido,
        `"${nf.produto}"`,
        `"${nf.fornecedor}"`,
        nf.quantidade,
        nf.peso,
        nf.volume,
        `"${nf.localizacao}"`,
        new Date(nf.data_recebimento).toLocaleDateString('pt-BR'),
        nf.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  if (nfs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Relatórios e Exportação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleImprimir} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Relatório
          </Button>
          <Button onClick={handleExportar} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {nfs.length} itens disponíveis para relatório
        </p>
      </CardContent>
    </Card>
  );
}