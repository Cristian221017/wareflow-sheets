import { log, error as logError } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCcw, AlertTriangle, CheckCircle, Clock, Activity, Database, Shield, Zap } from 'lucide-react';
import { useSystemMonitor, type SystemHealth, type HealthCheck, type SystemError } from '@/utils/systemMonitor';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  const monitor = useSystemMonitor();

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await monitor.runHealthCheck();
      setHealth(result);
    } catch (error) {
      logError('Health check failed:', error);
      monitor.addError({
        type: 'ui',
        severity: 'medium',
        message: 'Failed to run health check',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(runHealthCheck, 30000); // A cada 30 segundos
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warn':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return 'bg-green-500';
      case 'warn':
      case 'warning':
        return 'bg-yellow-500';
      case 'fail':
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor de saúde e performance do sistema
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Button
            onClick={runHealthCheck}
            disabled={loading}
            size="sm"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Verificar Agora
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health.overall)}
              Status Geral: {health.overall.toUpperCase()}
              <Badge variant={health.overall === 'healthy' ? 'default' : 'destructive'}>
                {health.overall}
              </Badge>
            </CardTitle>
            <CardDescription>
              Última verificação: {formatDistanceToNow(new Date(health.lastCheck), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Performance Metrics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Auth Load</span>
                </div>
                <div className="text-2xl font-bold">{health.performance.authLoadTime}ms</div>
                <Progress 
                  value={Math.min((health.performance.authLoadTime / 1000) * 100, 100)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">DB Connection</span>
                </div>
                <div className="text-2xl font-bold">{health.performance.dbConnectionTime}ms</div>
                <Progress 
                  value={Math.min((health.performance.dbConnectionTime / 2000) * 100, 100)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <div className="text-2xl font-bold">{health.performance.memoryUsage}MB</div>
                <Progress 
                  value={Math.min((health.performance.memoryUsage / 100) * 100, 100)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Network Latency</span>
                </div>
                <div className="text-2xl font-bold">{health.performance.networkLatency}ms</div>
                <Progress 
                  value={Math.min((health.performance.networkLatency / 1000) * 100, 100)} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Detalhes */}
      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">Health Checks</TabsTrigger>
          <TabsTrigger value="errors">
            Errors 
            {health && health.errors.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {health.errors.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Health Checks */}
        <TabsContent value="checks">
          <div className="grid gap-4">
            {health?.checks.map((check, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      {check.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={check.status === 'pass' ? 'default' : 'destructive'}>
                        {check.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {check.duration}ms
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{check.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(check.timestamp), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Errors */}
        <TabsContent value="errors">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {health?.errors.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      Nenhum erro ativo encontrado
                    </div>
                  </CardContent>
                </Card>
              ) : (
                health?.errors.map((error) => (
                  <Alert key={error.id}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{error.type} - {error.message}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(error.severity) as any}>
                          {error.severity}
                        </Badge>
                        {!error.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => monitor.resolveError(error.id)}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm">{error.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(error.timestamp), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                        {error.stack && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Stack trace
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                              {error.stack}
                            </pre>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Métricas detalhadas de performance do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {health && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Authentication Load Time</span>
                          <span className="text-sm">{health.performance.authLoadTime}ms</span>
                        </div>
                        <Progress value={Math.min((health.performance.authLoadTime / 1000) * 100, 100)} />
                        <p className="text-xs text-muted-foreground">
                          {health.performance.authLoadTime < 500 ? 'Excelente' : 
                           health.performance.authLoadTime < 1000 ? 'Bom' :
                           health.performance.authLoadTime < 2000 ? 'Aceitável' : 'Lento'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Database Connection Time</span>
                          <span className="text-sm">{health.performance.dbConnectionTime}ms</span>
                        </div>
                        <Progress value={Math.min((health.performance.dbConnectionTime / 2000) * 100, 100)} />
                        <p className="text-xs text-muted-foreground">
                          {health.performance.dbConnectionTime < 200 ? 'Excelente' : 
                           health.performance.dbConnectionTime < 500 ? 'Bom' :
                           health.performance.dbConnectionTime < 1000 ? 'Aceitável' : 'Lento'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Memory Usage</span>
                          <span className="text-sm">{health.performance.memoryUsage}MB</span>
                        </div>
                        <Progress value={Math.min((health.performance.memoryUsage / 100) * 100, 100)} />
                        <p className="text-xs text-muted-foreground">
                          {health.performance.memoryUsage < 50 ? 'Baixo' : 
                           health.performance.memoryUsage < 100 ? 'Normal' :
                           health.performance.memoryUsage < 200 ? 'Alto' : 'Crítico'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Network Latency</span>
                          <span className="text-sm">{health.performance.networkLatency}ms</span>
                        </div>
                        <Progress value={Math.min((health.performance.networkLatency / 1000) * 100, 100)} />
                        <p className="text-xs text-muted-foreground">
                          {health.performance.networkLatency < 100 ? 'Excelente' : 
                           health.performance.networkLatency < 300 ? 'Bom' :
                           health.performance.networkLatency < 500 ? 'Aceitável' : 'Lento'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}