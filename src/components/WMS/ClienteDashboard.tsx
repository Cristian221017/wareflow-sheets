import { log, warn, error as logError } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, FileText, Truck, BarChart3, PackageCheck, RefreshCw, Bug } from 'lucide-react';
import { StatusSeparacaoSummary } from '@/components/Dashboard/StatusSeparacaoSummary';
import { ClienteStatusDashboard } from '@/components/Dashboard/ClienteStatusDashboard';
import { ReportsActions } from '@/components/Dashboard/ReportsActions';
import { useNFsCliente } from '@/hooks/useNFsCliente';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export function ClienteDashboard() {
  const { data: stats, isLoading, error, refetch } = useDashboard();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDebug, setShowDebug] = useState(false);
  
  // Buscar APENAS todas as NFs do cliente para cálculos precisos e unificados
  const { data: todasNfs, isLoading: loadingTodas, refetch: refetchNfs } = useNFsCliente(); // Todas as NFs - fonte única de verdade

  // Calcular estatísticas baseadas nas NFs reais do cliente com lógica aprimorada
  const calculatedStats = useMemo(() => {
    if (!todasNfs || !Array.isArray(todasNfs)) {
      log('⚠️ Dados de NFs não disponíveis ainda');
      return null;
    }

    log('📊 Calculando dashboard baseado em NFs reais:', {
      total_nfs: todasNfs.length,
      sample_nf: todasNfs[0] ? {
        id: todasNfs[0].id,
        numero_nf: todasNfs[0].numero_nf,
        status: todasNfs[0].status,
        status_separacao: todasNfs[0].status_separacao,
        data_embarque: todasNfs[0].data_embarque,
        data_entrega: todasNfs[0].data_entrega
      } : null
    });

    // Contar por status principal
    const armazenadas = todasNfs.filter(nf => nf.status === 'ARMAZENADA').length;
    const solicitadas = todasNfs.filter(nf => nf.status === 'SOLICITADA').length;
    const confirmadas = todasNfs.filter(nf => nf.status === 'CONFIRMADA').length;
    
    // Em viagem: NFs confirmadas que têm data_embarque mas não data_entrega
    const emViagem = todasNfs.filter(nf => {
      const temEmbarque = nf.data_embarque && nf.data_embarque !== null;
      const temEntrega = nf.data_entrega && nf.data_entrega !== null;
      return nf.status === 'CONFIRMADA' && temEmbarque && !temEntrega;
    }).length;
    
    // Entregues: NFs com data_entrega ou status_separacao = 'entregue'
    const entregues = todasNfs.filter(nf => {
      const temEntrega = nf.data_entrega && nf.data_entrega !== null;
      const statusEntregue = nf.status_separacao === 'entregue';
      return temEntrega || statusEntregue;
    }).length;

    // Análise detalhada por status de separação
    const porStatusSeparacao = todasNfs.reduce((acc, nf) => {
      const status = nf.status_separacao || 'pendente';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const calculated = {
      nfsArmazenadas: armazenadas,
      solicitacoesPendentes: solicitadas,
      nfsConfirmadas: confirmadas,
      nfsEmViagem: emViagem,
      nfsEntregues: entregues,
      // Estatísticas extras para debug
      totalNfs: todasNfs.length,
      porStatusSeparacao,
      nfsComEmbarque: todasNfs.filter(nf => nf.data_embarque).length,
      nfsComEntrega: todasNfs.filter(nf => nf.data_entrega).length
    };

    log('📊 Dashboard calculado:', calculated);
    
    // Log detalhado de algumas NFs para debug
    const nfsConfirmadasDetalhe = todasNfs.filter(nf => nf.status === 'CONFIRMADA');
    if (nfsConfirmadasDetalhe.length > 0) {
      log('🔍 Detalhes das NFs CONFIRMADAS:', nfsConfirmadasDetalhe.map(nf => ({
        numero_nf: nf.numero_nf,
        status: nf.status,
        status_separacao: nf.status_separacao,
        data_embarque: nf.data_embarque,
        data_entrega: nf.data_entrega,
        eh_em_viagem: !!(nf.data_embarque && !nf.data_entrega),
        eh_entregue: !!(nf.data_entrega || nf.status_separacao === 'entregue')
      })));
    }
    
    return calculated;
  }, [todasNfs]);

  // Usar todasNfs como fonte única de dados para relatórios
  const allNfs = Array.isArray(todasNfs) ? todasNfs : [];

  const handleRefresh = async () => {
    log('🔄 DASHBOARD: Atualizando todas as queries do cliente');
    
    // Invalidar todas as queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['nfs-cliente'] });
    queryClient.invalidateQueries({ queryKey: ['nfs'] });
    
    // Refetch forçado das NFs do cliente
    await Promise.all([
      refetch(),
      refetchNfs(),
      queryClient.refetchQueries({ 
        predicate: (query) => {
          const [firstKey] = query.queryKey || [];
          return firstKey === 'nfs-cliente' || firstKey === 'nfs' || firstKey === 'dashboard';
        }
      })
    ]);
    
    log('🔄 DASHBOARD: Atualização concluída');
  };

  if (isLoading || loadingTodas || !calculatedStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Carregando dados...
            </div>
          </div>
        </div>
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
            className={`flex items-center gap-2 ${showDebug ? 'bg-blue-50 text-blue-700' : ''}`}
          >
            <Bug className="h-4 w-4" />
            {showDebug ? 'Ocultar Debug' : 'Debug'}
          </Button>
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

      {/* Painel de Debug */}
      {showDebug && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Informações de Debug
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Dados Brutos:</h4>
                <div className="text-sm space-y-1 font-mono bg-white p-3 rounded border">
                  <div>Total NFs: {todasNfs?.length || 0}</div>
                  <div>Loading: {loadingTodas ? 'Sim' : 'Não'}</div>
                  <div>User ID: {user?.id || 'N/A'}</div>
                  <div className="mt-2 text-xs text-blue-600">
                    Stats calculados: {calculatedStats ? 'Sim' : 'Não'}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Distribuição por Status:</h4>
                <div className="text-sm space-y-1 font-mono bg-white p-3 rounded border">
                  {todasNfs && todasNfs.length > 0 ? (
                    <>
                      <div>ARMAZENADA: {todasNfs.filter(nf => nf.status === 'ARMAZENADA').length}</div>
                      <div>SOLICITADA: {todasNfs.filter(nf => nf.status === 'SOLICITADA').length}</div>
                      <div>CONFIRMADA: {todasNfs.filter(nf => nf.status === 'CONFIRMADA').length}</div>
                      <div className="border-t pt-1 mt-1">
                        <div>Com embarque: {todasNfs.filter(nf => nf.data_embarque).length}</div>
                        <div>Com entrega: {todasNfs.filter(nf => nf.data_entrega).length}</div>
                        <div>Status 'entregue': {todasNfs.filter(nf => nf.status_separacao === 'entregue').length}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">Nenhuma NF encontrada</div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('📊 DEBUG - Dados completos das NFs:', todasNfs);
                  console.log('📊 DEBUG - Stats calculados:', finalStats);
                  toast.success('Dados logados no console do navegador');
                }}
              >
                Logar Dados Completos no Console
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


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