import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Truck, X } from "lucide-react";
import { NFCard } from "./NFCard";
import { NFFilters, type NFFilterState } from "./NFFilters";
import { NFBulkActions } from "./NFBulkActions";
import { useNFs, useFluxoMutations } from "@/hooks/useNFs";
import { subscribeNfChanges } from "@/lib/realtimeNfs";
import { useAuth } from "@/contexts/AuthContext";
import type { NotaFiscal } from "@/types/nf";

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

// Coluna de NFs Armazenadas
function ArmazenadasColumn({ 
  canRequest, 
  filters, 
  selectedIds, 
  onSelect,
  applyFilters 
}: { 
  canRequest: boolean;
  filters: NFFilterState;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  applyFilters: (nfs: NotaFiscal[]) => NotaFiscal[];
}) {
  const { data: nfs, isLoading, isError } = useNFs("ARMAZENADA");
  const { solicitar } = useFluxoMutations();

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];
  const filteredNfs = applyFilters(validNfs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          NFs Armazenadas
        </h3>
        <Badge variant="secondary">
          {filteredNfs.length}{validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
        </Badge>
      </div>

      {/* Ações em massa */}
      {filteredNfs.length > 0 && (
        <NFBulkActions
          nfs={filteredNfs}
          selectedIds={selectedIds.filter(id => filteredNfs.some(nf => nf.id === id))}
          onSelectionChange={ids => {
            // Manter apenas IDs válidos para esta coluna
            const validIds = ids.filter(id => filteredNfs.some(nf => nf.id === id));
            validIds.forEach(id => onSelect(id, true));
          }}
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
                canRequest ? (
                  <Button
                    size="sm"
                    disabled={solicitar.isPending}
                    onClick={() => solicitar.mutate(nf.id)}
                    className="w-full"
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    {solicitar.isPending ? "Solicitando..." : "Solicitar Carregamento"}
                  </Button>
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
  applyFilters 
}: { 
  canDecide: boolean;
  filters: NFFilterState;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  applyFilters: (nfs: NotaFiscal[]) => NotaFiscal[];
}) {
  const { data: nfs, isLoading, isError } = useNFs("SOLICITADA");
  const { confirmar, recusar } = useFluxoMutations();

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];
  const filteredNfs = applyFilters(validNfs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Carregamentos Solicitados
        </h3>
        <Badge variant="secondary">
          {filteredNfs.length}{validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
        </Badge>
      </div>

      {/* Ações em massa */}
      {filteredNfs.length > 0 && (
        <NFBulkActions
          nfs={filteredNfs}
          selectedIds={selectedIds.filter(id => filteredNfs.some(nf => nf.id === id))}
          onSelectionChange={ids => {
            const validIds = ids.filter(id => filteredNfs.some(nf => nf.id === id));
            validIds.forEach(id => onSelect(id, true));
          }}
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
  const { data: nfs, isLoading, isError } = useNFs("CONFIRMADA");

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];
  const filteredNfs = applyFilters(validNfs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Carregamentos Confirmados
        </h3>
        <Badge variant="secondary">
          {filteredNfs.length}{validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
        </Badge>
      </div>

      {filteredNfs.length > 0 ? (
        <div className="space-y-3">
          {filteredNfs.map((nf) => (
            <NFCard
              key={nf.id}
              nf={nf}
              showApprovalInfo
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
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Configurar realtime com guard para StrictMode
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    return subscribeNfChanges(queryClient);
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
      if (filters.cliente && nf.cliente_id !== filters.cliente) {
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
              applyFilters={applyFilters}
            />
          </TabsContent>
          <TabsContent value="solicitadas" className="mt-6">
            <SolicitadasColumn 
              canDecide={isTransportadora} 
              filters={filters}
              selectedIds={selectedIds}
              onSelect={handleSelection}
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
            applyFilters={applyFilters}
          />
        </div>
        <div>
          <SolicitadasColumn 
            canDecide={isTransportadora} 
            filters={filters}
            selectedIds={selectedIds}
            onSelect={handleSelection}
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