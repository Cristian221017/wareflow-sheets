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
  Eye
} from "lucide-react";
import { useDashboard, type DashboardStats } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface DashboardStatsComponentProps {
  onDeepLink?: (path: string) => void;
}

export function DashboardStatsComponent({ onDeepLink }: DashboardStatsComponentProps) {
  const { data: stats, isLoading, error } = useDashboard();
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Resumo adicional para transportadora */}
      {stats.userType === 'transportadora' && (
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
      )}

      {/* Resumo adicional para cliente */}
      {stats.userType === 'cliente' && stats.valorPendente && (
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
    </div>
  );
}