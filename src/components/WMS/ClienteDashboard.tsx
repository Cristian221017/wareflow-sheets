import { log, warn, error as logError } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FileText, Truck, BarChart3, PackageCheck } from 'lucide-react';
import { StatusSeparacaoSummary } from '@/components/Dashboard/StatusSeparacaoSummary';
import { ReportsActions } from '@/components/Dashboard/ReportsActions';
import { useNFsCliente } from '@/hooks/useNFsCliente';

export function ClienteDashboard() {
  const { data: stats, isLoading, error } = useDashboard();
  const { user } = useAuth();
  
  // Buscar NFs para relatórios
  const { data: nfsArmazenadas } = useNFsCliente("ARMAZENADA");
  const { data: nfsSolicitadas } = useNFsCliente("SOLICITADA");
  const { data: nfsConfirmadas } = useNFsCliente("CONFIRMADA");
  
  const allNfs = [
    ...(Array.isArray(nfsArmazenadas) ? nfsArmazenadas : []),
    ...(Array.isArray(nfsSolicitadas) ? nfsSolicitadas : []),
    ...(Array.isArray(nfsConfirmadas) ? nfsConfirmadas : [])
  ];

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Cálculos baseados nos dados do dashboard
  const totalNFs = stats.nfsArmazenadas + stats.solicitacoesPendentes + 
    Math.max(stats.nfsConfirmadas, (stats.nfsEmViagem || 0) + (stats.nfsEntregues || 0));
  const totalPeso = 0;
  const totalVolume = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              {stats.nfsArmazenadas} disponíveis para liberação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Armazenadas
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nfsArmazenadas}</div>
            <p className="text-xs text-muted-foreground">
              Disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solicitadas
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.solicitacoesPendentes}</div>
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
            <div className="text-2xl font-bold">{stats.nfsConfirmadas}</div>
            <p className="text-xs text-muted-foreground">
              Prontas para retirada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Em Viagem
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nfsEmViagem || 0}</div>
            <p className="text-xs text-muted-foreground">
              Em trânsito
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
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Armazenadas</span>
                </div>
                <span className="text-sm font-medium">{stats.nfsArmazenadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Solicitadas</span>
                </div>
                <span className="text-sm font-medium">{stats.solicitacoesPendentes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Confirmadas</span>
                </div>
                <span className="text-sm font-medium">{stats.nfsConfirmadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm">Em Viagem</span>
                </div>
                <span className="text-sm font-medium">{stats.nfsEmViagem || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm">Entregues</span>
                </div>
                <span className="text-sm font-medium">{stats.nfsEntregues || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Status</CardTitle>
            <CardDescription>
              Visão geral das suas mercadorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Total de Mercadorias</p>
                    <p className="text-sm text-muted-foreground">Todas as suas mercadorias</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalNFs}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Entregues</p>
                    <p className="text-sm text-muted-foreground">Entregas concluídas</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.nfsEntregues || 0}
                </div>
              </div>

              {(stats.nfsEmViagem || 0) > 0 && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  ℹ️ Você tem {stats.nfsEmViagem} mercadorias em trânsito
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Separação Summary - apenas armazenadas */}
      <StatusSeparacaoSummary showOnlyArmazenadas={true} />

      {/* Reports Actions */}
      <ReportsActions 
        nfs={allNfs}
        reportTitle="Relatório de Minhas Mercadorias"
        fileName="minhas-mercadorias"
      />
    </div>
  );
}