import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Package, Clock, CheckCircle, AlertTriangle, FileText, Printer, Download } from 'lucide-react';
import { NotaFiscal } from '@/types/nf';
import { NFFilters, NFFilterState } from '@/components/NfLists/NFFilters';
import { NFCard } from '@/components/NfLists/NFCard';
import { NFBulkActions } from '@/components/NfLists/NFBulkActions';
import { useNFs } from '@/hooks/useNFs';
import { StatusSeparacaoManager } from './StatusSeparacaoManager';
import { subscribeCentralizedChanges } from '@/lib/realtimeCentralized';
import { useQueryClient } from '@tanstack/react-query';
import { log, warn } from '@/utils/logger';
import { toast } from 'sonner';

const statusConfig = {
  pendente: {
    label: 'Pendente',
    icon: Clock,
    color: 'hsl(var(--muted-foreground))',
    description: 'Aguardando início da separação',
    progress: 0
  },
  em_separacao: {
    label: 'Em Separação',
    icon: Package,
    color: 'hsl(var(--primary))',
    description: 'Mercadoria sendo separada',
    progress: 50
  },
  separacao_concluida: {
    label: 'Separação Concluída',
    icon: CheckCircle,
    color: 'hsl(var(--success))',
    description: 'Separação finalizada com sucesso',
    progress: 100
  },
  separacao_com_pendencia: {
    label: 'Separação com Pendência',
    icon: AlertTriangle,
    color: 'hsl(var(--destructive))',
    description: 'Separação com problemas ou itens faltantes',
    progress: 75
  }
};

export function TransportadoraStatusSeparacao() {
  const { data: nfs = [], isLoading, error } = useNFs('ARMAZENADA');
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Setup realtime
  useEffect(() => {
    log("🔄 Configurando realtime centralizado para TransportadoraStatusSeparacao");
    
    const unsubscribe = subscribeCentralizedChanges(queryClient);

    return () => {
      log("🔌 Desconectando realtime - TransportadoraStatusSeparacao");
      unsubscribe?.();
    };
  }, [queryClient]);

  // Apply filters
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
      if (filters.dataInicio && nf.data_recebimento < filters.dataInicio) {
        return false;
      }
      if (filters.dataFim && nf.data_recebimento > filters.dataFim) {
        return false;
      }
      
      return true;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
          <p className="text-muted-foreground">
            Gerencie o status de separação das mercadorias armazenadas
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    warn('Erro ao carregar NFs armazenadas:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
          <p className="text-muted-foreground">
            Gerencie o status de separação das mercadorias armazenadas
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground">Tente recarregar a página</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!nfs.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
          <p className="text-muted-foreground">
            Gerencie o status de separação das mercadorias armazenadas
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma mercadoria armazenada</p>
            <p className="text-sm text-muted-foreground">As mercadorias armazenadas aparecerão aqui</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredNfs = applyFilters(nfs);

  // Função para imprimir relatório
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
          <title>Relatório de Mercadorias Armazenadas</title>
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
            <h1>Relatório de Mercadorias Armazenadas</h1>
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

    const totalPeso = filteredNfs.reduce((sum, nf) => sum + Number(nf.peso || 0), 0);
    const totalVolume = filteredNfs.reduce((sum, nf) => sum + Number(nf.volume || 0), 0);
    const totalQuantidade = filteredNfs.reduce((sum, nf) => sum + Number(nf.quantidade || 0), 0);

    // Resumo por status
    const nfsByStatus = filteredNfs.reduce((acc, nf) => {
      const status = nf.status_separacao || 'pendente';
      if (!acc[status]) acc[status] = [];
      acc[status].push(nf);
      return acc;
    }, {} as Record<string, NotaFiscal[]>);
    
    const statusCounts = Object.entries(statusConfig).map(([status, config]) => ({
      status,
      label: config.label,
      count: nfsByStatus[status]?.length || 0
    }));

    html += `
      <div class="summary">
        <h3>Resumo</h3>
        <p><strong>Total de mercadorias armazenadas:</strong> ${filteredNfs.length}</p>
        <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
        <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
        <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
        <h4>Por Status de Separação:</h4>
        <ul>
          ${statusCounts.map(s => `<li>${s.label}: ${s.count}</li>`).join('')}
        </ul>
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
            <th>Status Separação</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredNfs.forEach(nf => {
      const statusLabel = statusConfig[nf.status_separacao || 'pendente']?.label || 'Pendente';
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
          <td>${statusLabel}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="footer">
        <p>Relatório gerado pelo Sistema WMS - Portal Transportadora</p>
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
      'NF', 'Pedido', 'Produto', 'Fornecedor', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Localização', 'Data Recebimento', 'Status Separação'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredNfs.map(nf => [
        nf.numero_nf,
        nf.numero_pedido,
        `"${nf.produto}"`,
        `"${nf.fornecedor}"`,
        nf.quantidade,
        nf.peso,
        nf.volume,
        `"${nf.localizacao}"`,
        new Date(nf.data_recebimento).toLocaleDateString('pt-BR'),
        statusConfig[nf.status_separacao || 'pendente']?.label || 'Pendente'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mercadorias-armazenadas-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  // Group NFs by separation status
  const nfsByStatus = filteredNfs.reduce((acc, nf) => {
    const status = nf.status_separacao || 'pendente';
    if (!acc[status]) acc[status] = [];
    acc[status].push(nf);
    return acc;
  }, {} as Record<string, NotaFiscal[]>);

  // Calculate summary statistics
  const totalNfs = filteredNfs.length;
  const statusSummary = Object.entries(statusConfig).map(([status, config]) => ({
    status,
    config,
    count: nfsByStatus[status]?.length || 0
  }));

  // Get NFs that can be requested for loading (separacao_concluida)
  const nfsParaLiberacao = filteredNfs.filter(nf => nf.status_separacao === 'separacao_concluida');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
          <p className="text-muted-foreground">
            Gerencie o status de separação das mercadorias armazenadas ({totalNfs} itens)
          </p>
        </div>
        {filteredNfs.length > 0 && (
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

      <NFFilters filters={filters} onFiltersChange={setFilters} />

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusSummary.map(({ status, config, count }) => {
          const Icon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
                <div className="mt-2">
                  <Progress value={(count / totalNfs) * 100} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{config.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bulk Actions for completed separation */}
      {nfsParaLiberacao.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ações em Lote</CardTitle>
            <CardDescription>
              {nfsParaLiberacao.length} mercadorias com separação concluída disponíveis para liberação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NFBulkActions
              nfs={nfsParaLiberacao}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </CardContent>
        </Card>
      )}

      {/* NFs List by Status */}
      <div className="space-y-6">
        {Object.entries(nfsByStatus).map(([status, statusNfs]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          if (!statusNfs.length) return null;

          const Icon = config.icon;
          
          return (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" style={{ color: config.color }} />
                  {config.label} ({statusNfs.length})
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusNfs.map((nf) => (
                  <div key={nf.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <NFCard
                        nf={nf}
                        onSelect={() => {}}
                        isSelected={false}
                      />
                    </div>
                    <div className="ml-4">
                      <StatusSeparacaoManager
                        nfId={nf.id}
                        statusAtual={nf.status_separacao || 'pendente'}
                        numeroNf={nf.numero_nf}
                        canEdit={true} // Transportadora pode editar status
                        onStatusChanged={() => {
                          // Trigger a refetch or update
                          log('Status de separação alterado para NF:', nf.numero_nf);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredNfs.length === 0 && filters && Object.keys(filters).length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
          </CardContent>
        </Card>
      )}

      {/* Realtime footer */}
      <div className="text-xs text-muted-foreground text-center py-2">
        ⚡ Dados atualizados em tempo real
      </div>
    </div>
  );
}