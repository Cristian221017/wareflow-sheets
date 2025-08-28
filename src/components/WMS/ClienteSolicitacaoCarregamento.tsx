import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNFs, useFluxoMutations } from "@/hooks/useNFs";
import { useNFsCliente } from "@/hooks/useNFsCliente";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, X, Printer, Download } from "lucide-react";
import { NFFilters, type NFFilterState } from "@/components/NfLists/NFFilters";
import { NFCard } from "@/components/NfLists/NFCard";
import { NFBulkActions } from "@/components/NfLists/NFBulkActions";
import { subscribeCentralizedChanges } from "@/lib/realtimeCentralized";
import type { NotaFiscal } from "@/types/nf";
import { log } from "@/utils/logger";
import { toast } from "sonner";

export function ClienteSolicitacaoCarregamento() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const once = useRef(false);
  const isCliente = user?.type === "cliente";
  const isTransportadora = user?.role === "admin_transportadora" || user?.role === "operador";
  const { data: nfs, isLoading, isError } = isCliente ? useNFsCliente("SOLICITADA") : useNFs("SOLICITADA");
  const { confirmar, recusar } = useFluxoMutations();

  // Estados para filtros e seleção múltipla
  const [filters, setFilters] = useState<NFFilterState>({
    searchNF: "",
    searchPedido: "",
    cliente: "",
    produto: "",
    fornecedor: "",
    dataInicio: "",
    dataFim: "",
    localizacao: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Configurar realtime centralizado
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    log("🔄 Configurando realtime centralizado para ClienteSolicitacaoCarregamento");
    return subscribeCentralizedChanges(queryClient);
  }, [queryClient]);

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

    const totalPeso = filteredNfs.reduce((sum, nf) => sum + Number(nf.peso || 0), 0);
    const totalVolume = filteredNfs.reduce((sum, nf) => sum + Number(nf.volume || 0), 0);
    const totalQuantidade = filteredNfs.reduce((sum, nf) => sum + Number(nf.quantidade || 0), 0);

    let html = `
      <html>
        <head>
          <title>Relatório de Carregamentos Solicitados</title>
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
            <h1>Relatório de Carregamentos Solicitados</h1>
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
        <p><strong>Total de carregamentos solicitados:</strong> ${filteredNfs.length}</p>
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

    filteredNfs.forEach(nf => {
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

  // Função para exportar CSV
  const handleExportar = () => {
    const headers = [
      'NF', 'Pedido', 'Produto', 'Fornecedor', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Localização', 'Data Recebimento', 'Status'
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
        nf.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `carregamentos-solicitados-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar dados</p>
      </div>
    );
  }

  const validNfs = Array.isArray(nfs) ? nfs : [];

  if (validNfs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Carregamentos Solicitados</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe e gerencie as solicitações de carregamento
          </p>
        </div>

        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Nenhuma solicitação de carregamento</h3>
          <p className="text-sm">As solicitações de carregamento aparecerão aqui</p>
        </div>
      </div>
    );
  }

  // Função para filtrar NFs
  const applyFilters = (nfs: NotaFiscal[]) => {
    return nfs.filter((nf) => {
      if (
        filters.searchNF &&
        !nf.numero_nf.toLowerCase().includes(filters.searchNF.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.searchPedido &&
        !nf.numero_pedido.toLowerCase().includes(filters.searchPedido.toLowerCase())
      ) {
        return false;
      }
      if (filters.cliente && nf.cliente_id !== filters.cliente) {
        return false;
      }
      if (
        filters.produto &&
        !nf.produto.toLowerCase().includes(filters.produto.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.fornecedor &&
        !nf.fornecedor.toLowerCase().includes(filters.fornecedor.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.localizacao &&
        !nf.localizacao?.toLowerCase().includes(filters.localizacao.toLowerCase())
      ) {
        return false;
      }
      if (filters.dataInicio || filters.dataFim) {
        const nfDate = new Date(nf.data_recebimento);
        if (filters.dataInicio) {
          const startDate = new Date(filters.dataInicio);
          if (nfDate < startDate) return false;
        }
        if (filters.dataFim) {
          const endDate = new Date(filters.dataFim);
          endDate.setHours(23, 59, 59, 999);
          if (nfDate > endDate) return false;
        }
      }
      return true;
    });
  };

  const filteredNfs = applyFilters(validNfs);

  const handleSelection = (id: string, selected: boolean) => {
    setSelectedIds((prev) =>
      selected ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Carregamentos Solicitados</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe e gerencie as solicitações de carregamento
        </p>
      </div>

      {/* Filtros */}
      <NFFilters
        filters={filters}
        onFiltersChange={setFilters}
        showClientFilter={isTransportadora}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <CardTitle>Solicitações de Carregamento</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredNfs.length}
                {validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
              </Badge>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ações em massa */}
          {filteredNfs.length > 0 && (
            <NFBulkActions
              nfs={filteredNfs}
              selectedIds={selectedIds.filter((id) => filteredNfs.some((nf) => nf.id === id))}
              onSelectionChange={setSelectedIds}
              canDecide={isTransportadora}
            />
          )}

          {filteredNfs.length > 0 ? (
            <div className="space-y-3">
              {filteredNfs.map((nf) => (
                <NFCard
                  key={nf.id}
                  nf={nf}
                  showRequestInfo
                  showSelection={filteredNfs.length > 1}
                  isSelected={selectedIds.includes(nf.id)}
                  onSelect={handleSelection}
                  actions={
                    isTransportadora ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={confirmar.isPending || recusar.isPending}
                          onClick={() => confirmar.mutate(nf.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {confirmar.isPending ? "Aprovando..." : "Aprovar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={confirmar.isPending || recusar.isPending}
                          onClick={() => recusar.mutate(nf.id)}
                          className="flex-1"
                        >
                          <X className="w-3 h-3 mr-1" />
                          {recusar.isPending ? "Recusando..." : "Recusar"}
                        </Button>
                      </div>
                    ) : null
                  }
                />
              ))}
            </div>
          ) : validNfs.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma solicitação encontrada com os filtros aplicados</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Footer com informações */}
      <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">🔄 Atualizações em tempo real ativas</p>
        <p>As mudanças são refletidas automaticamente sem necessidade de recarregar a página</p>
      </div>
    </div>
  );
}