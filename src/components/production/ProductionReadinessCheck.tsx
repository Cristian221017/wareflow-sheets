import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useProductionMonitor, type ProductionHealthCheck } from '@/utils/productionMonitor';
import { toast } from 'sonner';

export function ProductionReadinessCheck() {
  const [healthStatus, setHealthStatus] = useState<ProductionHealthCheck | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { runHealthCheck, validateDataIntegrity } = useProductionMonitor();

  const handleRunCheck = async () => {
    setIsRunning(true);
    try {
      const result = await runHealthCheck();
      setHealthStatus(result);
      
      if (result.status === 'healthy') {
        toast.success('Sistema pronto para produção! ✅');
      } else {
        toast.warning(`Sistema ${result.status}: ${result.issues.length} problemas encontrados`);
      }
    } catch (error) {
      toast.error('Erro ao executar verificação de saúde');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'degraded': return 'text-warning'; 
      case 'unhealthy': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return null;
    }
  };

  // Auto-run check on mount
  useEffect(() => {
    handleRunCheck();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verificação de Prontidão para Produção</h2>
          <p className="text-muted-foreground">
            Verificação completa de segurança, performance e funcionalidade
          </p>
        </div>
        <Button 
          onClick={handleRunCheck} 
          disabled={isRunning}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Verificando...' : 'Verificar Novamente'}
        </Button>
      </div>

      {healthStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {getStatusIcon(healthStatus.status)}
              <div>
                <CardTitle className={getStatusColor(healthStatus.status)}>
                  Sistema {healthStatus.status === 'healthy' ? 'Saudável' : 
                         healthStatus.status === 'degraded' ? 'Com Problemas' : 'Com Falhas Críticas'}
                </CardTitle>
                <CardDescription>
                  Última verificação: {new Date(healthStatus.timestamp).toLocaleString()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {Object.values(healthStatus.checks).filter(Boolean).length}
                </div>
                <div className="text-sm text-muted-foreground">Checks Passaram</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {healthStatus.metrics.responseTime.toFixed(0)}ms
                </div>
                <div className="text-sm text-muted-foreground">Tempo Resposta</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {healthStatus.metrics.memoryUsage.toFixed(1)}MB
                </div>
                <div className="text-sm text-muted-foreground">Uso Memória</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(healthStatus.metrics.errorRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Taxa de Erro</div>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(healthStatus.checks).map(([check, passed]) => (
                <div key={check} className="flex items-center gap-2">
                  {passed ? 
                    <CheckCircle className="h-4 w-4 text-success" /> : 
                    <XCircle className="h-4 w-4 text-destructive" />
                  }
                  <span className={passed ? 'text-success' : 'text-destructive'}>
                    {check.charAt(0).toUpperCase() + check.slice(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Issues */}
            {healthStatus.issues.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Problemas Encontrados:</strong>
                    <ul className="list-disc list-inside space-y-1">
                      {healthStatus.issues.map((issue, index) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Production Readiness Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Status para Produção:</span>
                <Badge variant={
                  healthStatus.status === 'healthy' ? 'default' : 
                  healthStatus.status === 'degraded' ? 'secondary' : 'destructive'
                }>
                  {healthStatus.status === 'healthy' ? '✅ PRONTO' :
                   healthStatus.status === 'degraded' ? '⚠️ ATENÇÃO' : '❌ NÃO PRONTO'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Verificação de Produção</CardTitle>
          <CardDescription>
            Itens críticos que devem ser verificados antes do deploy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ProductionChecklistItem
              title="Configurações de Segurança"
              status="warning"
              description="4 avisos de segurança encontrados - corrigir antes do deploy"
            />
            <ProductionChecklistItem
              title="Proteção contra Vazamento de Senhas"
              status="error"
              description="Ativar proteção no painel do Supabase"
            />
            <ProductionChecklistItem
              title="Paginação para Grandes Datasets"
              status="success"
              description="Implementado com hooks otimizados"
            />
            <ProductionChecklistItem
              title="Monitoramento de Performance"
              status="success"
              description="Sistema de monitoramento ativo"
            />
            <ProductionChecklistItem
              title="Responsividade Mobile"
              status="success"
              description="Interface responsiva implementada"
            />
            <ProductionChecklistItem
              title="Tratamento de Erros"
              status="success"
              description="Sistema centralizado de tratamento de erros"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ProductionChecklistItemProps {
  title: string;
  status: 'success' | 'warning' | 'error';
  description: string;
}

function ProductionChecklistItem({ title, status, description }: ProductionChecklistItemProps) {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-success" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning" />,
    error: <XCircle className="h-4 w-4 text-destructive" />
  };

  const colors = {
    success: 'text-success',
    warning: 'text-warning', 
    error: 'text-destructive'
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      {icons[status]}
      <div className="flex-1">
        <div className={`font-medium ${colors[status]}`}>{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}