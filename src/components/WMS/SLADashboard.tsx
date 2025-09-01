import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { useSLAMetrics, useSLATrends } from '@/hooks/useSLAMetrics';

interface SLADashboardProps {
  className?: string;
}

export function SLADashboard({ className }: SLADashboardProps) {
  const metrics = useSLAMetrics();
  const trends = useSLATrends(30);

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

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Tempo Médio Cadastro → Separação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastro → Separação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Média:</span>
                <Badge variant={getSLABadgeVariant(getSLAStatus(metrics.tempoMedioCadastroSeparacao))}>
                  {formatTempo(metrics.tempoMedioCadastroSeparacao)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P90:</span>
                <span className="text-sm font-medium">
                  {formatTempo(metrics.tempoP90CadastroSeparacao)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Máximo:</span>
                <span className="text-sm font-medium">
                  {formatTempo(metrics.tempoMaximoCadastroSeparacao)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tempo Médio Separação → Liberação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Separação → Liberação</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Média:</span>
                <Badge variant={getSLABadgeVariant(getSLAStatus(metrics.tempoMedioSeparacaoLiberacao))}>
                  {formatTempo(metrics.tempoMedioSeparacaoLiberacao)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P90:</span>
                <span className="text-sm font-medium">
                  {formatTempo(metrics.tempoP90SeparacaoLiberacao)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Máximo:</span>
                <span className="text-sm font-medium">
                  {formatTempo(metrics.tempoMaximoSeparacaoLiberacao)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Gerais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estatísticas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total NFs:</span>
                <span className="text-sm font-medium">{metrics.totalNFsAnalisadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Com Separação:</span>
                <span className="text-sm font-medium">{metrics.nfsComSeparacao}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Com Liberação:</span>
                <span className="text-sm font-medium">{metrics.nfsComLiberacao}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendências dos últimos 30 dias */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência dos Últimos 30 Dias
            </CardTitle>
            <CardDescription>
              Evolução do tempo médio de processamento por semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends.map((trend, index) => {
                const tendenciaAnterior = index > 0 ? trends[index - 1].tempoMedio : trend.tempoMedio;
                const mudanca = trend.tempoMedio - tendenciaAnterior;
                const isGood = mudanca <= 0;

                return (
                  <div key={trend.semana} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">
                        Semana de {new Date(trend.semana).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trend.totalNFs} NFs • {trend.nfsProcessadas} processadas
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatTempo(trend.tempoMedio)}
                      </span>
                      {index > 0 && (
                        <div className={`flex items-center gap-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                          {isGood ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          <span className="text-xs">
                            {Math.abs(mudanca).toFixed(1)}h
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}