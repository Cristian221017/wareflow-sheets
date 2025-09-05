import { useState, useEffect, useRef } from "react";
import { useNFs } from "@/hooks/useNFs";
import { useNFsCliente, useClienteFluxoMutations } from "@/hooks/useNFsCliente";
import { useAuth } from "@/contexts/AuthContext";
import { useLastVisit } from '@/hooks/useLastVisit';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CarregamentoActionButton } from './CarregamentoActionButton';
import { AlertCircle, CheckCircle, Clock, Package, Pause, Truck, BarChart3, Eye, RefreshCw } from "lucide-react";
import { NFFilters, type NFFilterState } from "@/components/NfLists/NFFilters";
import { NFCard } from "@/components/NfLists/NFCard";
import { NFBulkActions } from "@/components/NfLists/NFBulkActions";
import type { NotaFiscal } from "@/types/nf";
import { log } from "@/utils/logger";
import { toast } from "sonner";

// Configuração dos status de separação
const statusConfig = {
  pendente: {
    label: "Aguardando Separação",
    icon: Clock,
    color: "text-muted-foreground",
    description: "Sua mercadoria está sendo preparada para separação",
    progress: 25,
  },
  em_separacao: {
    label: "Em Separação",
    icon: Package,
    color: "text-blue-600",
    description: "Nossa equipe está separando seus produtos",
    progress: 50,
  },
  separacao_concluida: {
    label: "Separação Concluída",
    icon: CheckCircle,
    color: "text-green-600",
    description: "Produtos separados e prontos para carregamento",
    progress: 75,
  },
  separacao_com_pendencia: {
    label: "Pendências na Separação",
    icon: AlertCircle,
    color: "text-red-600",
    description: "Encontramos algumas pendências que requerem atenção",
    progress: 60,
  },
  em_viagem: {
    label: "Em Viagem",
    icon: Truck,
    color: "text-indigo-600",
    description: "Sua mercadoria está em transporte",
    progress: 90,
  },
  entregue: {
    label: "Entregue",
    icon: CheckCircle,
    color: "text-emerald-600",
    description: "Mercadoria entregue com sucesso",
    progress: 100,
  },
};

export function ClienteStatusSeparacao() {
  const { user } = useAuth();
  const once = useRef(false);
  const { markVisitForComponent } = useLastVisit();
  const queryClient = useQueryClient();
  const isCliente = user?.type === "cliente";
  const { data: nfs, isLoading, isError, refetch } = isCliente ? useNFsCliente("ARMAZENADA") : useNFs("ARMAZENADA");
  const { solicitar } = useClienteFluxoMutations();

  // Função para atualizar dados
  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ['nfs'] });
    await refetch();
    toast.success("Dados atualizados!");
  };

  // Estados para filtros e seleção múltipla
  const [filters, setFilters] = useState<NFFilterState>({
    searchNF: "",
    searchPedido: "",
    cliente: "all",
    produto: "",
    fornecedor: "",
    dataInicio: "",
    dataFim: "",
    localizacao: "",
    statusSeparacao: "all",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Configurar realtime centralizado
  // Apenas marcar a visita (limpa badges imediatamente). Realtime é global.
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    log("👀 Visit ClienteStatusSeparacao");
    markVisitForComponent('nfs-armazenadas');
  }, [markVisitForComponent]);

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

  const validNfs = Array.isArray(nfs) ? nfs.filter(nf => 
    nf.status_separacao !== 'em_viagem' && nf.status_separacao !== 'entregue'
  ) : [];

  if (validNfs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o status de separação das suas mercadorias armazenadas
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Nenhuma nota fiscal armazenada</h3>
          <p className="text-sm">As mercadorias armazenadas aparecerão aqui</p>
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
      if (
        filters.statusSeparacao &&
        filters.statusSeparacao !== 'all' &&
        nf.status_separacao !== filters.statusSeparacao
      ) {
        return false;
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

  const statusGroups = filteredNfs.reduce((acc, nf) => {
    const status = nf.status_separacao || "pendente";
    if (!acc[status]) acc[status] = [];
    acc[status].push(nf);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe o status de separação das suas mercadorias e solicite carregamentos
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <NFFilters filters={filters} onFiltersChange={setFilters} showClientFilter={false} />

      {/* Ações em massa para NFs com separação concluída */}
      {filteredNfs.some((nf) => nf.status_separacao === "separacao_concluida") && (
          <NFBulkActions
            nfs={filteredNfs.filter((nf) => nf.status_separacao === "separacao_concluida")}
            selectedIds={selectedIds.filter((id) =>
              filteredNfs.some((nf) => nf.id === id && nf.status_separacao === "separacao_concluida")
            )}
            onSelectionChange={setSelectedIds}
            canRequest={isCliente}
            solicitarMutation={solicitar}
          />
      )}

      {/* Lista detalhada com ações de carregamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalhes por Nota Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNfs.length > 0 ? (
            <div className="space-y-3">
              {filteredNfs.map((nf) => {
                const status = nf.status_separacao || "pendente";
                const config = statusConfig[status];

                return (
                  <div key={nf.id} className="space-y-3">
                    <NFCard
                      nf={nf}
                      showRequestInfo
                      showSelection={
                        filteredNfs.length > 1 && nf.status_separacao === "separacao_concluida"
                      }
                      isSelected={selectedIds.includes(nf.id)}
                      onSelect={handleSelection}
                      actions={
                        isCliente ? (
                          <CarregamentoActionButton
                            nfId={nf.id}
                            numeroNF={nf.numero_nf}
                            status={nf.status}
                            statusSeparacao={nf.status_separacao}
                            canSolicitar={true}
                            className="w-full"
                            solicitarMutation={solicitar}
                          />
                        ) : null
                      }
                    />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <config.icon className={`w-3 h-3 ${config.color}`} />
                          <span>Status: {config.label}</span>
                        </div>
                        <span className="text-muted-foreground">{config.progress}%</span>
                      </div>
                      <Progress value={config.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : validNfs.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma NF encontrada com os filtros aplicados</p>
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