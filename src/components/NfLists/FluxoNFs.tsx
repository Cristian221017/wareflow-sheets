import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Truck, X, Printer, Download } from "lucide-react";
import { NFCard } from "./NFCard";
import { NFFilters, type NFFilterState } from "./NFFilters";
import { NFBulkActions } from "./NFBulkActions";
import { useNFs, useFluxoMutations } from "@/hooks/useNFs";
import { useNFsCliente, useClienteFluxoMutations } from "@/hooks/useNFsCliente";
import { CarregamentoActionButton } from "@/components/WMS/CarregamentoActionButton";
import { subscribeCentralizedChanges } from "@/lib/realtimeCentralized";
import { useAuth } from "@/contexts/AuthContext";
import type { NotaFiscal } from "@/types/nf";
import { log } from "@/utils/logger";
import { toast } from "sonner";

// Componente para mostrar estado vazio
function EmptyState({ icon: Icon, title, description }: { 
  icon: React.ComponentType<any>, 
  title: string, 
  description: string 
}) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}

// Função compartilhada para impressão
function generatePrintReport(nfs: NotaFiscal[], filters: NFFilterState, reportTitle: string) {
  const hoje = new Date();
  const dataHoraImpressao = hoje.toLocaleString('pt-BR');
  
  const filtrosAplicados = [];
  if (filters.searchNF) filtrosAplicados.push(`NF: ${filters.searchNF}`);
  if (filters.searchPedido) filtrosAplicados.push(`Pedido: ${filters.searchPedido}`);
  if (filters.cliente && filters.cliente !== 'all') filtrosAplicados.push(`Cliente: ${filters.cliente}`);
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
      <p><strong>Total de NFs:</strong> ${nfs.length}</p>
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
      <p>Relatório gerado pelo Sistema WMS - Fluxo de NFs</p>
    </div>
  </body>
  </html>
  `;

  return html;
}

// Função compartilhada para export CSV
function generateCSVExport(nfs: NotaFiscal[], reportTitle: string) {
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

  return csvContent;
}

// Coluna de NFs Armazenadas
function ArmazenadasColumn({ 
  canRequest, 
  filters, 
  selectedIds, 
  onSelect,
  onSelectionChange,
  applyFilters 
}: { 
  canRequest: boolean;
  filters: NFFilterState;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectionChange: (ids: string[]) => void;
  applyFilters: (nfs: NotaFiscal[]) => NotaFiscal[];
}) {
  const { user } = useAuth();
  const isCliente = user?.type === 'cliente';
  const isTransportadora = user?.role === 'admin_transportadora' || user?.role === 'operador';
  const { data: nfs, isLoading, isError } = isCliente ? useNFsCliente("ARMAZENADA") : useNFs("ARMAZENADA");
  const { solicitar } = isCliente ? useClienteFluxoMutations() : useFluxoMutations();

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];
  const filteredNfs = applyFilters(validNfs);

  // Função para imprimir relatório
  const handleImprimir = () => {
    const html = generatePrintReport(filteredNfs, filters, "Relatório de NFs Armazenadas");
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
    const csvContent = generateCSVExport(filteredNfs, "NFs Armazenadas");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `nfs-armazenadas-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          NFs Armazenadas
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredNfs.length}{validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
          </Badge>
          {filteredNfs.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleImprimir} variant="outline" size="sm">
                <Printer className="w-3 h-3 mr-1" />
                Imprimir
              </Button>
              <Button onClick={handleExportar} variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Ações em massa */}
      {filteredNfs.length > 0 && (
        <NFBulkActions
          nfs={filteredNfs}
          selectedIds={selectedIds.filter(id => filteredNfs.some(nf => nf.id === id))}
          onSelectionChange={onSelectionChange}
          canRequest={canRequest}
        />
      )}

      {filteredNfs.length > 0 ? (
        <div className="space-y-3">
          {filteredNfs.map((nf) => (
            <NFCard
              key={nf.id}
              nf={nf}
              showSelection={filteredNfs.length > 1}
              isSelected={selectedIds.includes(nf.id)}
              onSelect={onSelect}
              actions={
                isCliente && canRequest ? (
                  <CarregamentoActionButton
                    nfId={nf.id}
                    numeroNF={nf.numero_nf}
                    status={nf.status}
                    statusSeparacao={nf.status_separacao}
                    canSolicitar={canRequest}
                    solicitarMutation={solicitar}
                  />
                ) : canRequest && nf.status_separacao === 'separacao_concluida' ? (
                  <Button
                    size="sm"
                    disabled={solicitar.isPending}
                    onClick={() => solicitar.mutate({ nfId: nf.id })}
                    className="w-full"
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    {solicitar.isPending ? "Solicitando..." : "Solicitar Carregamento"}
                  </Button>
                ) : canRequest && nf.status_separacao !== 'separacao_concluida' ? (
                  <div className="text-center p-2 text-sm text-muted-foreground bg-muted rounded">
                    Carregamento disponível apenas quando separação estiver concluída
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      ) : validNfs.length > 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma NF encontrada com os filtros aplicados</p>
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="Nenhuma NF armazenada"
          description="As mercadorias armazenadas aparecerão aqui"
        />
      )}
    </div>
  );
}

// Coluna de Carregamentos Solicitados
function SolicitadasColumn({ 
  canDecide, 
  filters, 
  selectedIds, 
  onSelect,
  onSelectionChange,
  applyFilters 
}: { 
  canDecide: boolean;
  filters: NFFilterState;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectionChange: (ids: string[]) => void;
  applyFilters: (nfs: NotaFiscal[]) => NotaFiscal[];
}) {
  const { user } = useAuth();
  const isCliente = user?.type === 'cliente';
  const isTransportadora = user?.role === 'admin_transportadora' || user?.role === 'operador';
  const { data: nfs, isLoading, isError } = isCliente ? useNFsCliente("SOLICITADA") : useNFs("SOLICITADA");
  const { confirmar, recusar } = useFluxoMutations();

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];
  const filteredNfs = applyFilters(validNfs);

  // Função para imprimir relatório
  const handleImprimir = () => {
    const html = generatePrintReport(filteredNfs, filters, "Relatório de Carregamentos Solicitados");
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
    const csvContent = generateCSVExport(filteredNfs, "Carregamentos Solicitados");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Carregamentos Solicitados
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredNfs.length}{validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
          </Badge>
          {filteredNfs.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleImprimir} variant="outline" size="sm">
                <Printer className="w-3 h-3 mr-1" />
                Imprimir
              </Button>
              <Button onClick={handleExportar} variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Ações em massa */}
      {filteredNfs.length > 0 && (
        <NFBulkActions
          nfs={filteredNfs}
          selectedIds={selectedIds.filter(id => filteredNfs.some(nf => nf.id === id))}
          onSelectionChange={onSelectionChange}
          canDecide={canDecide}
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
              onSelect={onSelect}
              actions={
                canDecide ? (
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
      ) : (
        <EmptyState
          icon={Clock}
          title="Nenhuma solicitação pendente"
          description="As solicitações de carregamento aparecerão aqui"
        />
      )}
    </div>
  );
}

// Coluna de Confirmadas
function ConfirmadasColumn({ 
  filters, 
  selectedIds, 
  onSelect,
  applyFilters 
}: { 
  filters: NFFilterState;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  applyFilters: (nfs: NotaFiscal[]) => NotaFiscal[];
}) {
  const { user } = useAuth();
  const isCliente = user?.type === 'cliente';
  const isTransportadora = user?.role === 'admin_transportadora' || user?.role === 'operador';
  const { data: nfs, isLoading, isError } = isCliente ? useNFsCliente("CONFIRMADA") : useNFs("CONFIRMADA");

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];
  const filteredNfs = applyFilters(validNfs);

  // Função para imprimir relatório
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');
    
    const filtrosAplicados = [];
    if (filters.searchNF) filtrosAplicados.push(`NF: ${filters.searchNF}`);
    if (filters.searchPedido) filtrosAplicados.push(`Pedido: ${filters.searchPedido}`);
    if (filters.cliente && filters.cliente !== 'all') filtrosAplicados.push(`Cliente: ${filters.cliente}`);
    if (filters.produto) filtrosAplicados.push(`Produto: ${filters.produto}`);
    if (filters.fornecedor) filtrosAplicados.push(`Fornecedor: ${filters.fornecedor}`);
    if (filters.localizacao) filtrosAplicados.push(`Localização: ${filters.localizacao}`);
    if (filters.dataInicio) filtrosAplicados.push(`Data início: ${new Date(filters.dataInicio).toLocaleDateString('pt-BR')}`);
    if (filters.dataFim) filtrosAplicados.push(`Data fim: ${new Date(filters.dataFim).toLocaleDateString('pt-BR')}`);

    let html = `
      <html>
        <head>
          <title>Relatório de Carregamentos Confirmados</title>
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

    html += `
      <div class="summary">
        <h3>Resumo</h3>
        <p><strong>Total de carregamentos confirmados:</strong> ${filteredNfs.length}</p>
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
            <th>Status Separação</th>
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
          <td>${nf.status_separacao || 'Pendente'}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="footer">
        <p>Relatório gerado pelo Sistema WMS - Fluxo de NFs</p>
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
        nf.status_separacao || 'Pendente'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `carregamentos-confirmados-fluxo-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Carregamentos Confirmados
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredNfs.length}{validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
          </Badge>
          {filteredNfs.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleImprimir} variant="outline" size="sm">
                <Printer className="w-3 h-3 mr-1" />
                Imprimir
              </Button>
              <Button onClick={handleExportar} variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {filteredNfs.length > 0 ? (
        <div className="space-y-3">
          {filteredNfs.map((nf) => (
            <NFCard
              key={nf.id}
              nf={nf}
              showApprovalInfo
              showRequestInfo
              showSelection={false} // Confirmadas não precisam de seleção
            />
          ))}
        </div>
      ) : validNfs.length > 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum carregamento confirmado encontrado com os filtros aplicados</p>
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="Nenhum carregamento confirmado"
          description="Os carregamentos confirmados aparecerão aqui"
        />
      )}
    </div>
  );
}

export function FluxoNFs() {
  const { user, clientes } = useAuth();
  const queryClient = useQueryClient();
  const once = useRef(false);
  
  // Estados para filtros e seleção múltipla
  const [filters, setFilters] = useState<NFFilterState>({
    searchNF: '',
    searchPedido: '',
    cliente: '',
    produto: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    localizacao: '',
    statusSeparacao: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Configurar realtime centralizado com guard para StrictMode
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    log('🔄 Configurando realtime centralizado para FluxoNFs');
    return subscribeCentralizedChanges(queryClient);
  }, [queryClient]);

  // Determinar permissões baseado no tipo e role do usuário
  const isCliente = user?.type === 'cliente';
  const isTransportadora = user?.role === 'admin_transportadora' || user?.role === 'operador';
  
  // Função para filtrar NFs
  const applyFilters = (nfs: NotaFiscal[]) => {
    return nfs.filter(nf => {
      // Filtro por número da NF
      if (filters.searchNF && !nf.numero_nf.toLowerCase().includes(filters.searchNF.toLowerCase())) {
        return false;
      }
      
      // Filtro por número do pedido
      if (filters.searchPedido && !nf.numero_pedido.toLowerCase().includes(filters.searchPedido.toLowerCase())) {
        return false;
      }
      
      // Filtro por cliente (apenas para transportadora)
      if (filters.cliente && filters.cliente !== 'all' && nf.cliente_id !== filters.cliente) {
        return false;
      }
      
      // Filtro por produto
      if (filters.produto && !nf.produto.toLowerCase().includes(filters.produto.toLowerCase())) {
        return false;
      }
      
      // Filtro por fornecedor
      if (filters.fornecedor && !nf.fornecedor.toLowerCase().includes(filters.fornecedor.toLowerCase())) {
        return false;
      }
      
      // Filtro por localização
      if (filters.localizacao && !nf.localizacao?.toLowerCase().includes(filters.localizacao.toLowerCase())) {
        return false;
      }
      
      // Filtro por data
      if (filters.dataInicio || filters.dataFim) {
        const nfDate = new Date(nf.data_recebimento);
        
        if (filters.dataInicio) {
          const startDate = new Date(filters.dataInicio);
          if (nfDate < startDate) return false;
        }
        
        if (filters.dataFim) {
          const endDate = new Date(filters.dataFim);
          endDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
          if (nfDate > endDate) return false;
        }
      }
      
      // Filtro por status de separação
      if (filters.statusSeparacao && filters.statusSeparacao !== 'all' && nf.status_separacao !== filters.statusSeparacao) {
        return false;
      }
      
      return true;
    });
  };

  const handleSelection = (id: string, selected: boolean) => {
    setSelectedIds(prev => 
      selected 
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    );
  };

  const clearSelection = () => setSelectedIds([]);
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Fluxo de Notas Fiscais</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o fluxo completo de solicitação e aprovação de carregamentos em tempo real
        </p>
      </div>

      {/* Filtros */}
      <NFFilters
        filters={filters}
        onFiltersChange={setFilters}
        showClientFilter={isTransportadora} // Apenas transportadora vê filtro de cliente
      />

      {/* Layout em abas para mobile, colunas para desktop */}
      <div className="block lg:hidden">
        <Tabs defaultValue="armazenadas" className="w-full" onValueChange={clearSelection}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="armazenadas">Armazenadas</TabsTrigger>
            <TabsTrigger value="solicitadas">Solicitadas</TabsTrigger>
            <TabsTrigger value="confirmadas">Confirmadas</TabsTrigger>
          </TabsList>
          <TabsContent value="armazenadas" className="mt-6">
            <ArmazenadasColumn 
              canRequest={isCliente} 
              filters={filters}
              selectedIds={selectedIds}
              onSelect={handleSelection}
              onSelectionChange={setSelectedIds}
              applyFilters={applyFilters}
            />
          </TabsContent>
          <TabsContent value="solicitadas" className="mt-6">
            <SolicitadasColumn 
              canDecide={isTransportadora} 
              filters={filters}
              selectedIds={selectedIds}
              onSelect={handleSelection}
              onSelectionChange={setSelectedIds}
              applyFilters={applyFilters}
            />
          </TabsContent>
          <TabsContent value="confirmadas" className="mt-6">
            <ConfirmadasColumn 
              filters={filters}
              selectedIds={selectedIds}
              onSelect={handleSelection}
              applyFilters={applyFilters}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Layout em colunas para desktop */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <div>
          <ArmazenadasColumn 
            canRequest={isCliente} 
            filters={filters}
            selectedIds={selectedIds}
            onSelect={handleSelection}
            onSelectionChange={setSelectedIds}
            applyFilters={applyFilters}
          />
        </div>
        <div>
          <SolicitadasColumn 
            canDecide={isTransportadora} 
            filters={filters}
            selectedIds={selectedIds}
            onSelect={handleSelection}
            onSelectionChange={setSelectedIds}
            applyFilters={applyFilters}
          />
        </div>
        <div>
          <ConfirmadasColumn 
            filters={filters}
            selectedIds={selectedIds}
            onSelect={handleSelection}
            applyFilters={applyFilters}
          />
        </div>
      </div>

      {/* Footer com informações */}
      <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">🔄 Atualizações em tempo real ativas</p>
        <p>As mudanças são refletidas automaticamente sem necessidade de recarregar a página</p>
      </div>
    </div>
  );
}