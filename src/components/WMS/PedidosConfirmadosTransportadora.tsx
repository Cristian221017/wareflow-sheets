import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNFs } from '@/hooks/useNFs';
import { SolicitacoesConfirmadasCard } from './SolicitacoesConfirmadasCard';
import { NFFilters, type NFFilterState } from '@/components/NfLists/NFFilters';
import { useAuth } from '@/contexts/AuthContext';
import { useInvalidateAll } from '@/hooks/useInvalidateAll';
import { CheckCircle, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { NotaFiscal } from '@/types/nf';
import { useState } from 'react';

export function PedidosConfirmadosTransportadora() {
  const { user } = useAuth();
  const { data: confirmadas, isLoading } = useNFs("CONFIRMADA");
  const invalidateAll = useInvalidateAll();
  
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

  // Função para filtrar NFs
  const applyFilters = (nfs: NotaFiscal[]) => {
    return nfs.filter(nf => {
      if (filters.searchNF && !nf.numero_nf.toLowerCase().includes(filters.searchNF.toLowerCase())) {
        return false;
      }
      if (filters.searchPedido && !nf.numero_pedido.toLowerCase().includes(filters.searchPedido.toLowerCase())) {
        return false;
      }
      if (filters.produto && !nf.produto.toLowerCase().includes(filters.produto.toLowerCase())) {
        return false;
      }
      if (filters.fornecedor && !nf.fornecedor.toLowerCase().includes(filters.fornecedor.toLowerCase())) {
        return false;
      }
      if (filters.localizacao && !nf.localizacao.toLowerCase().includes(filters.localizacao.toLowerCase())) {
        return false;
      }
      if (filters.dataInicio) {
        const nfDate = new Date(nf.data_recebimento);
        const startDate = new Date(filters.dataInicio);
        if (nfDate < startDate) return false;
      }
      if (filters.dataFim) {
        const nfDate = new Date(nf.data_recebimento);
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        if (nfDate > endDate) return false;
      }
      return true;
    });
  };

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
  const filteredConfirmadas = applyFilters(validConfirmadas);

  // Função para imprimir relatório (atualizada para usar filtros)
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
    
    const totalPeso = filteredConfirmadas.reduce((sum, nf) => sum + Number(nf.peso || 0), 0);
    const totalVolume = filteredConfirmadas.reduce((sum, nf) => sum + Number(nf.volume || 0), 0);
    const totalQuantidade = filteredConfirmadas.reduce((sum, nf) => sum + Number(nf.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Carregamentos Confirmados - Transportadora</title>
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
            <h1>Relatório de Carregamentos Confirmados</h1>
            <p>Portal da Transportadora</p>
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
        <p><strong>Total de carregamentos confirmados:</strong> ${filteredConfirmadas.length}</p>
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

    filteredConfirmadas.forEach(nf => {
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

  // Função para exportar CSV (atualizada para usar filtros)
  const handleExportar = () => {
    const headers = [
      'NF', 'Pedido', 'Ordem Compra', 'Fornecedor', 'Produto', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Data Confirmação', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredConfirmadas.map(nf => [
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
                Carregamentos Confirmados
              </CardTitle>
              <CardDescription>
                Carregamentos aprovados e prontos para retirada ({filteredConfirmadas.length} 
                {validConfirmadas.length !== filteredConfirmadas.length && ` de ${validConfirmadas.length}`} itens)
              </CardDescription>
            </div>
            {filteredConfirmadas.length > 0 && (
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
          {filteredConfirmadas.length > 0 ? (
            <div className="space-y-3">
              {filteredConfirmadas.map((nf) => (
                <SolicitacoesConfirmadasCard
                  key={nf.id}
                  nf={nf}
                  onRefresh={() => invalidateAll.invalidateAll()}
                />
              ))}
            </div>
          ) : validConfirmadas.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum carregamento encontrado com os filtros aplicados</p>
              <p className="text-sm mt-1">Tente ajustar os filtros para ver mais resultados</p>
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
    </div>
  );
}