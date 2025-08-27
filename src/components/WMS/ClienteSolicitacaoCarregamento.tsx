import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNFs, useFluxoMutations } from "@/hooks/useNFs";
import { useNFsCliente } from "@/hooks/useNFsCliente";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, X } from "lucide-react";
import { NFFilters, type NFFilterState } from "@/components/NfLists/NFFilters";
import { NFCard } from "@/components/NfLists/NFCard";
import { NFBulkActions } from "@/components/NfLists/NFBulkActions";
import { subscribeCentralizedChanges } from "@/lib/realtimeCentralized";
import type { NotaFiscal } from "@/types/nf";
import { log } from "@/utils/logger";

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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Solicitações de Carregamento
            </div>
            <Badge variant="secondary">
              {filteredNfs.length}
              {validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
            </Badge>
          </CardTitle>
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