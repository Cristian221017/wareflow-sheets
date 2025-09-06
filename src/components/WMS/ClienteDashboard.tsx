import { log, warn, error as logError } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, FileText, Truck, BarChart3, PackageCheck, RefreshCw } from 'lucide-react';
import { StatusSeparacaoSummary } from '@/components/Dashboard/StatusSeparacaoSummary';
import { ClienteStatusDashboard } from '@/components/Dashboard/ClienteStatusDashboard';
import { ReportsActions } from '@/components/Dashboard/ReportsActions';
import { useNFsCliente } from '@/hooks/useNFsCliente';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export function ClienteDashboard() {
  const { data: stats, isLoading, error, refetch } = useDashboard();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Buscar todas as NFs do cliente para cálculos precisos
  const { data: nfsArmazenadas, isLoading: loadingArmazenadas } = useNFsCliente("ARMAZENADA");
  const { data: nfsSolicitadas, isLoading: loadingSolicitadas } = useNFsCliente("SOLICITADA");
  const { data: nfsConfirmadas, isLoading: loadingConfirmadas } = useNFsCliente("CONFIRMADA");
  const { data: todasNfs, isLoading: loadingTodas } = useNFsCliente(); // Todas as NFs

  // Calcular estatísticas baseadas nas NFs reais do cliente
  const calculatedStats = useMemo(() => {
    if (!todasNfs || !Array.isArray(todasNfs)) {
      return null;
    }

    log('📊 Calculando dashboard baseado em NFs reais:', todasNfs);

    const armazenadas = todasNfs.filter(nf => nf.status === 'ARMAZENADA').length;
    const solicitadas = todasNfs.filter(nf => nf.status === 'SOLICITADA').length;
    const confirmadas = todasNfs.filter(nf => nf.status === 'CONFIRMADA').length;
    
    // Em viagem: NFs confirmadas que têm data_embarque mas não data_entrega
    const emViagem = todasNfs.filter(nf => 
      nf.status === 'CONFIRMADA' && 
      nf.data_embarque && 
      !nf.data_entrega
    ).length;
    
    // Entregues: NFs com data_entrega ou status_separacao = 'entregue'
    const entregues = todasNfs.filter(nf => 
      nf.data_entrega || nf.status_separacao === 'entregue'
    ).length;

    const calculated = {
      nfsArmazenadas: armazenadas,
      solicitacoesPendentes: solicitadas,
      nfsConfirmadas: confirmadas,
      nfsEmViagem: emViagem,
      nfsEntregues: entregues
    };

    log('📊 Dashboard calculado:', calculated);
    return calculated;
  }, [todasNfs]);

  const allNfs = [
    ...(Array.isArray(nfsArmazenadas) ? nfsArmazenadas : []),
    ...(Array.isArray(nfsSolicitadas) ? nfsSolicitadas : []),
    ...(Array.isArray(nfsConfirmadas) ? nfsConfirmadas : [])
  ];

  const handleRefresh = async () => {
    log('🔄 DASHBOARD: Atualizando todas as queries do cliente');
    
    // Invalidar todas as queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['nfs-cliente'] });
    queryClient.invalidateQueries({ queryKey: ['nfs'] });
    
    // Refetch forçado
    await Promise.all([
      refetch(),
      queryClient.refetchQueries({ 
        predicate: (query) => {
          const [firstKey] = query.queryKey || [];
          return firstKey === 'nfs-cliente' || firstKey === 'nfs' || firstKey === 'dashboard';
        }
      })
    ]);
  };

  if (isLoading || loadingTodas || !calculatedStats) {
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

  // Usar stats calculadas baseadas nas NFs reais, com fallback para o RPC
  const finalStats = calculatedStats || {
    nfsArmazenadas: stats?.nfsArmazenadas || 0,
    solicitacoesPendentes: stats?.solicitacoesPendentes || 0,
    nfsConfirmadas: stats?.nfsConfirmadas || 0,
    nfsEmViagem: stats?.nfsEmViagem || 0,
    nfsEntregues: stats?.nfsEntregues || 0
  };

  log('📊 Stats finais para exibição:', finalStats);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Armazenadas
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalStats.nfsArmazenadas}</div>
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
            <div className="text-2xl font-bold">{finalStats.solicitacoesPendentes}</div>
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
            <div className="text-2xl font-bold">{finalStats.nfsConfirmadas}</div>
            <p className="text-xs text-muted-foreground">
              Prontas para retirada
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
                <span className="text-sm font-medium">{finalStats.nfsArmazenadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Solicitadas</span>
                </div>
                <span className="text-sm font-medium">{finalStats.solicitacoesPendentes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Confirmadas</span>
                </div>
                <span className="text-sm font-medium">{finalStats.nfsConfirmadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm">Em Viagem</span>
                </div>
                <span className="text-sm font-medium">{finalStats.nfsEmViagem}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm">Entregues</span>
                </div>
                <span className="text-sm font-medium">{finalStats.nfsEntregues}</span>
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
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Em Viagem</p>
                    <p className="text-sm text-muted-foreground">Mercadorias em trânsito</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {finalStats.nfsEmViagem}
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
                  {finalStats.nfsEntregues}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Separação Summary - componente visual melhorado */}
      <ClienteStatusDashboard />

      {/* Reports Actions */}
      <ReportsActions 
        nfs={allNfs}
        reportTitle="Relatório de Minhas Mercadorias"
        fileName="minhas-mercadorias"
      />
    </div>
  );
}