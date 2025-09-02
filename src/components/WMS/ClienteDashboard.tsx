import { log, warn, error as logError } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FileText, Truck, BarChart3 } from 'lucide-react';

export function ClienteDashboard() {
  const {
    totalNFs,
    nfsArmazenadas,
    nfsSolicitadas,
    nfsConfirmadas,
    totalPeso,
    totalVolume,
    recentActivity,
    getStatusCount,
    isLoading,
    hasData
  } = useOptimizedDashboard();
  const { user } = useAuth();

  // Debug otimizado - apenas informações essenciais
  log('🔍 ClienteDashboard Optimized:', {
    user: user?.email,
    hasData,
    counts: { nfsArmazenadas, nfsSolicitadas, nfsConfirmadas }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Mercadorias
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNFs}</div>
            <p className="text-xs text-muted-foreground">
              {nfsArmazenadas} disponíveis para liberação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Peso Total
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalPeso || 0).toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground">
              Volume: {(totalVolume || 0).toFixed(2)} m³
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Pendentes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nfsSolicitadas}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando análise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Confirmadas
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nfsConfirmadas}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para retirada
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status das Mercadorias</CardTitle>
            <CardDescription>
              Distribuição das suas mercadorias por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-sm">Armazenadas</span>
                </div>
                <span className="text-sm font-medium">{getStatusCount('ARMAZENADA')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span className="text-sm">Solicitadas</span>
                </div>
                <span className="text-sm font-medium">{getStatusCount('SOLICITADA')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm">Confirmadas</span>
                </div>
                <span className="text-sm font-medium">{getStatusCount('CONFIRMADA')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Atividades</CardTitle>
            <CardDescription>
              Movimentações recentes das suas mercadorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((nf) => (
                <div key={nf.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{nf.numero_nf}</p>
                    <p className="text-xs text-muted-foreground">{nf.produto}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{nf.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(nf.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}