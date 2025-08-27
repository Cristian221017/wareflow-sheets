import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, Clock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { NotaFiscal } from '@/types/nf';
import { NFFilters, NFFilterState } from '@/components/NfLists/NFFilters';
import { NFCard } from '@/components/NfLists/NFCard';
import { NFBulkActions } from '@/components/NfLists/NFBulkActions';
import { useNFs } from '@/hooks/useNFs';
import { StatusSeparacaoManager } from './StatusSeparacaoManager';
import { subscribeCentralizedChanges } from '@/lib/realtimeCentralized';
import { useQueryClient } from '@tanstack/react-query';
import { log, warn } from '@/utils/logger';

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
    cliente: '',
    produto: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    localizacao: '',
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
        <p className="text-muted-foreground">
          Gerencie o status de separação das mercadorias armazenadas ({totalNfs} itens)
        </p>
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