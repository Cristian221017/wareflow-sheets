import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  Eye,
  Truck,
  PackageCheck,
  Calendar,
  BarChart3,
  Timer,
  Target
} from "lucide-react";
import { useDashboard, type DashboardStats } from "@/hooks/useDashboard";
import { useSLAMetrics } from "@/hooks/useSLAMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface DashboardStatsComponentProps {
  onDeepLink?: (path: string) => void;
}

export function DashboardStatsComponent({ onDeepLink }: DashboardStatsComponentProps) {
  const { data: stats, isLoading, error } = useDashboard();
  const { data: slaMetrics, isLoading: slaLoading } = useSLAMetrics();
  const navigate = useNavigate();

  const handleDeepLink = (path: string) => {
    if (onDeepLink) {
      onDeepLink(path);
    } else {
      navigate(path);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={`skeleton-${i}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {error ? 'Erro ao carregar estatísticas' : 'Nenhuma estatística disponível'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatsForUserType = (stats: DashboardStats) => {
    if (stats.userType === 'transportadora') {
      return [
        {
          title: "Solicitações Pendentes",
          value: stats.solicitacoesPendentes,
          description: "Aguardando aprovação",
          icon: Clock,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          deepLink: "?tab=solicitacoes&status=pendente",
          urgent: stats.solicitacoesPendentes > 0
        },
        {
          title: "NFs Armazenadas",
          value: stats.nfsArmazenadas,
          description: "Disponíveis para solicitação",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          deepLink: "?tab=armazenadas"
        },
        {
          title: "Confirmadas",
          value: stats.nfsConfirmadas,
          description: "Carregamentos autorizados",
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
          deepLink: "?tab=confirmadas"
        },
        {
          title: "Em Viagem",
          value: stats.nfsEmViagem,
          description: "Mercadorias em trânsito",
          icon: Truck,
          color: "text-indigo-600",
          bgColor: "bg-indigo-100",
          deepLink: "/mercadorias-embarcadas"
        },
        {
          title: "Entregues",
          value: stats.nfsEntregues,
          description: "Entregas concluídas",
          icon: PackageCheck,
          color: "text-emerald-600",
          bgColor: "bg-emerald-100",
          deepLink: "/mercadorias-entregues"
        },
        {
          title: "Docs Vencendo",
          value: stats.docsVencendo,
          description: "Próximos do vencimento",
          icon: AlertTriangle,
          color: "text-red-600",
          bgColor: "bg-red-100",
          deepLink: "?tab=financeiro&filter=vencendo",
          urgent: stats.docsVencendo > 0
        }
      ];
    } else {
      // Cliente
      return [
        {
          title: "Mercadorias Armazenadas",
          value: stats.nfsArmazenadas,
          description: "Disponíveis para solicitação",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          deepLink: "?tab=mercadorias"
        },
        {
          title: "Solicitações Enviadas",
          value: stats.solicitacoesPendentes,
          description: "Aguardando aprovação",
          icon: Clock,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          deepLink: "?tab=solicitacoes"
        },
        {
          title: "Carregamentos Confirmados",
          value: stats.nfsConfirmadas,
          description: "Prontos para retirada",
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
          deepLink: "?tab=confirmados"
        },
        {
          title: "Em Viagem",
          value: stats.nfsEmViagem,
          description: "Mercadorias em trânsito",
          icon: Truck,
          color: "text-indigo-600",
          bgColor: "bg-indigo-100",
          deepLink: "/mercadorias-embarcadas"
        },
        {
          title: "Entregues",
          value: stats.nfsEntregues,
          description: "Entregas concluídas",
          icon: PackageCheck,
          color: "text-emerald-600",
          bgColor: "bg-emerald-100",
          deepLink: "/mercadorias-entregues"
        },
        {
          title: stats.valorPendente ? "Valor Pendente" : "Documentos Pendentes",
          value: stats.valorPendente ? `R$ ${stats.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stats.docsVencendo,
          description: stats.valorPendente ? "Total em aberto" : "Aguardando pagamento",
          icon: DollarSign,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          deepLink: "?tab=financeiro",
          urgent: (stats.valorVencido && stats.valorVencido > 0) || stats.docsVencidos > 0
        }
      ];
    }
  };

  const statsCards = getStatsForUserType(stats);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral {stats.userType === 'transportadora' ? 'da transportadora' : 'das suas mercadorias e financeiro'}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Tempo real ativo
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statsCards.map((stat) => (
          <Card key={`${stat.title}-${stat.value}`} className={`relative transition-all hover:shadow-md ${stat.urgent ? 'ring-2 ring-red-200' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
                {stat.urgent && (
                  <Badge variant="destructive" className="ml-2 text-xs">Urgente</Badge>
                )}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {stat.description}
              </p>
              {stat.deepLink && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleDeepLink(stat.deepLink!)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Detalhes
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo adicional para transportadora com logística */}
      {stats.userType === 'transportadora' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumo da Operação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span>
                    <strong>{stats.nfsArmazenadas}</strong> NFs disponíveis
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>
                    <strong>{stats.solicitacoesPendentes}</strong> aguardando decisão
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    <strong>{stats.nfsConfirmadas}</strong> confirmadas hoje
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  <span>
                    <strong>{stats.nfsEmViagem}</strong> em trânsito
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <span>
                    <strong>{stats.nfsEntregues}</strong> entregues
                  </span>
                </div>
                {stats.docsVencendo > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">
                      <strong>{stats.docsVencendo}</strong> documentos vencendo
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fluxo Logístico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Fluxo Logístico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Armazenadas</p>
                      <p className="text-sm text-muted-foreground">Disponíveis para solicitação</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {stats.nfsArmazenadas}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Confirmadas</p>
                      <p className="text-sm text-muted-foreground">Prontas para embarque</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {stats.nfsConfirmadas}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-medium">Em Viagem</p>
                      <p className="text-sm text-muted-foreground">Em trânsito para destino</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                    {stats.nfsEmViagem}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <PackageCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium">Entregues</p>
                      <p className="text-sm text-muted-foreground">Concluídas com sucesso</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {stats.nfsEntregues}
                  </Badge>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Taxa de Entrega</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {stats.nfsEntregues + stats.nfsEmViagem > 0 
                        ? `${Math.round((stats.nfsEntregues / (stats.nfsEntregues + stats.nfsEmViagem)) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas de Performance */}
          {slaMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance (Últimos 30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Timer className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Tempo Médio</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">
                        {slaMetrics.tempoMedioEntregaHoras > 0 
                          ? `${Math.round(slaMetrics.tempoMedioEntregaHoras)}h`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slaMetrics.tempoMedioEntregaHoras > 0 
                          ? `${Math.round(slaMetrics.tempoMedioEntregaHoras / 24)} dias`
                          : 'Sem dados'}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">SLA</span>
                      </div>
                      <p className={`text-xl font-bold ${
                        slaMetrics.slaCumprimentoPercent >= 95 ? 'text-green-600' :
                        slaMetrics.slaCumprimentoPercent >= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {slaMetrics.slaCumprimentoPercent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cumprimento
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Entregas no Prazo</span>
                      <span className="font-medium text-green-600">
                        {slaMetrics.entregasNoPrazo}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span>Entregas Atrasadas</span>
                      <span className="font-medium text-red-600">
                        {slaMetrics.entregasAtrasadas}
                      </span>
                    </div>

                    {slaMetrics.mercadoriasEmAtraso > 0 && (
                      <div className="flex justify-between items-center text-sm p-2 bg-red-50 rounded">
                        <span className="text-red-700">Em Atraso</span>
                        <span className="font-medium text-red-700">
                          {slaMetrics.mercadoriasEmAtraso}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Resumo adicional para cliente com logística */}
      {stats.userType === 'cliente' && (
        <>
          {stats.valorPendente && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Situação Financeira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pendente</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {stats.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {stats.valorVencido && stats.valorVencido > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vencido</p>
                      <p className="text-2xl font-bold text-red-600">
                        R$ {stats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status das Mercadorias do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Status das Mercadorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Armazenadas</span>
                  </div>
                  <Badge variant="secondary">{stats.nfsArmazenadas}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Aguardando Aprovação</span>
                  </div>
                  <Badge variant="secondary">{stats.solicitacoesPendentes}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Confirmadas</span>
                  </div>
                  <Badge variant="secondary">{stats.nfsConfirmadas}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm">Em Viagem</span>
                  </div>
                  <Badge variant="secondary">{stats.nfsEmViagem}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">Entregues</span>
                  </div>
                  <Badge variant="secondary">{stats.nfsEntregues}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas de Performance do Cliente */}
          {slaMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Suas Entregas (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className={`text-3xl font-bold mb-1 ${
                      slaMetrics.slaCumprimentoPercent >= 95 ? 'text-green-600' :
                      slaMetrics.slaCumprimentoPercent >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {slaMetrics.slaCumprimentoPercent}%
                    </p>
                    <p className="text-sm text-muted-foreground">Entregas no Prazo</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>No Prazo:</span>
                      <span className="font-medium text-green-600">
                        {slaMetrics.entregasNoPrazo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Atrasadas:</span>
                      <span className="font-medium text-red-600">
                        {slaMetrics.entregasAtrasadas}
                      </span>
                    </div>
                  </div>

                  {slaMetrics.tempoMedioEntregaHoras > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Tempo Médio de Entrega
                        </span>
                        <span className="font-medium">
                          {Math.round(slaMetrics.tempoMedioEntregaHoras / 24)} dias
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}