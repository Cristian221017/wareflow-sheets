// Force cache refresh: 2025-01-03
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { useSLAMetrics } from '@/hooks/useSLAMetrics';

interface SLADashboardProps {
  className?: string;
}

export function SLADashboard({ className }: SLADashboardProps) {
  const { data: metrics, isLoading } = useSLAMetrics();

  const formatTempo = (horas: number): string => {
    if (horas === 0) return '-';
    if (horas < 1) return `${Math.round(horas * 60)}min`;
    if (horas < 24) return `${horas.toFixed(1)}h`;
    return `${Math.round(horas / 24)}d`;
  };

  const getSLAStatus = (tempo: number, limite: number = 24): 'success' | 'warning' | 'error' => {
    if (tempo === 0) return 'success';
    if (tempo <= limite) return 'success';
    if (tempo <= limite * 1.5) return 'warning';
    return 'error';
  };

  const getSLABadgeVariant = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary'; 
      case 'error': return 'destructive';
    }
  };

  if (isLoading || !metrics) {
    return <div className="p-4">Carregando métricas de SLA...</div>;
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Tempo Médio de Entrega */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Entrega</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tempo médio:</span>
                <Badge variant={getSLABadgeVariant(getSLAStatus(metrics.tempoMedioEntregaHoras, 168))}>
                  {formatTempo(metrics.tempoMedioEntregaHoras)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Em dias:</span>
                <span className="text-sm font-medium">
                  {metrics.tempoMedioEntregaHoras > 0 
                    ? `${Math.round(metrics.tempoMedioEntregaHoras / 24)} dias`
                    : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cumprimento de SLA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumprimento de SLA</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Percentual:</span>
                <Badge variant={metrics.slaCumprimentoPercent >= 95 ? 'default' : 
                               metrics.slaCumprimentoPercent >= 80 ? 'secondary' : 'destructive'}>
                  {metrics.slaCumprimentoPercent}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No prazo:</span>
                <span className="text-sm font-medium text-green-600">
                  {metrics.entregasNoPrazo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Atrasadas:</span>
                <span className="text-sm font-medium text-red-600">
                  {metrics.entregasAtrasadas}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Situação Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Situação Atual</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total entregas:</span>
                <span className="text-sm font-medium">
                  {metrics.entregasNoPrazo + metrics.entregasAtrasadas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Em atraso:</span>
                <span className={`text-sm font-medium ${metrics.mercadoriasEmAtraso > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.mercadoriasEmAtraso}
                </span>
              </div>
              {metrics.mercadoriasEmAtraso > 0 && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ Mercadorias em viagem há mais de 7 dias
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo de Performance (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {metrics.slaCumprimentoPercent}%
              </p>
              <p className="text-sm text-green-700">Entregas no Prazo</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {metrics.tempoMedioEntregaHoras > 0 
                  ? `${Math.round(metrics.tempoMedioEntregaHoras / 24)}`
                  : '0'}
              </p>
              <p className="text-sm text-blue-700">Dias Médios de Entrega</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {metrics.mercadoriasEmAtraso}
              </p>
              <p className="text-sm text-orange-700">Mercadorias em Atraso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}