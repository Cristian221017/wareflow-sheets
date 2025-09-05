import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Package, Clock, CheckCircle, AlertTriangle, FileText, Truck, RefreshCw } from 'lucide-react';
import { NotaFiscal } from '@/types/nf';
import { NFFilters, NFFilterState } from '@/components/NfLists/NFFilters';
import { NFCard } from '@/components/NfLists/NFCard';
import { NFBulkActions } from '@/components/NfLists/NFBulkActions';
import { useNFs } from '@/hooks/useNFs';
import { StatusSeparacaoManager } from './StatusSeparacaoManager';
import { NFDeleteManager } from './NFDeleteManager';
import { log, warn } from '@/utils/logger';
import { toast } from 'sonner';
import { RefreshButton } from '@/components/common/RefreshButton';
import { useQueryClient } from '@tanstack/react-query';

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
    progress: 75
  },
  separacao_com_pendencia: {
    label: 'Separação com Pendência',
    icon: AlertTriangle,
    color: 'hsl(var(--destructive))',
    description: 'Separação com problemas ou itens faltantes',
    progress: 60
  },
  em_viagem: {
    label: 'Em Viagem',
    icon: Truck,
    color: 'hsl(217 91% 60%)',
    description: 'Mercadoria despachada e em transporte',
    progress: 90
  },
  entregue: {
    label: 'Entregue',
    icon: CheckCircle,
    color: 'hsl(142 76% 36%)',
    description: 'Mercadoria entregue ao destinatário',
    progress: 100
  }
};

export function TransportadoraStatusSeparacao() {
  const { data: nfs = [], isLoading, error } = useNFs('ARMAZENADA');
  
  // Filtrar NFs excluindo aquelas em viagem ou entregues na tela de armazenamento
  const filteredArmazenadasNfs = nfs.filter(nf => 
    nf.status_separacao !== 'em_viagem' && nf.status_separacao !== 'entregue'
  );

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

  // Realtime é global via RealtimeProvider - não precisa de subscription local

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

  if (!filteredArmazenadasNfs.length) {
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

  const filteredNfs = applyFilters(filteredArmazenadasNfs);

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
    <NFDeleteManager>
      {({ canDelete, onDelete }) => (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mercadorias Armazenadas</h1>
              <p className="text-muted-foreground">
                Gerencie o status de separação das mercadorias armazenadas ({totalNfs} itens)
              </p>
            </div>
            <RefreshButton 
              queryTypes={['nfs', 'dashboard', 'transportadora']}
              iconOnly
            />
          </div>

      <NFFilters filters={filters} onFiltersChange={setFilters} />

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
                        canDelete={canDelete}
                        onDelete={onDelete}
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
      )}
    </NFDeleteManager>
  );
}