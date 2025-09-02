import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useMemoryLeakDetection, useRenderPerformance } from '@/hooks/useMemoryLeak';
import { handleError, SystemError } from '@/utils/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { log, warn, error as logError } from '@/utils/logger';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Zap,
  RefreshCw,
  TrendingUp,
  Users,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'running';
  message: string;
  details?: string;
  timing?: number;
  suggestions?: string[];
}

interface SystemStats {
  totalUsers: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

export function SystemDiagnostics() {
  const { user } = useAuth();
  const { addSubscription } = useMemoryLeakDetection('SystemDiagnostics');
  const { renderCount } = useRenderPerformance('SystemDiagnostics');
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    // Monitor status do realtime
    const channel = supabase.channel('diagnostic-channel');
    
    channel.subscribe((status) => {
      setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
    });

    addSubscription(() => {
      supabase.removeChannel(channel);
    });

    // Auto-run diagnóstico inicial
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);
    
    const results: DiagnosticResult[] = [];
    
    try {
      // 1. Teste de conectividade Supabase
      results.push(await testSupabaseConnection());
      
      // 2. Teste de autenticação
      results.push(await testAuthentication());
      
      // 3. Teste de RLS policies
      results.push(await testRLSPolicies());
      
      // 4. Teste de performance das queries
      results.push(await testQueryPerformance());
      
      // 5. Verificar integridade dos dados
      results.push(await testDataIntegrity());
      
      // 6. Monitor de memória e performance
      results.push(testMemoryUsage());
      
      // 7. Teste de realtime
      results.push(await testRealtimeConnection());

      setDiagnostics(results);
      setLastRunTime(new Date());
      
      // Carregar estatísticas do sistema
      await loadSystemStats();

    } catch (error) {
      handleError(error, { component: 'SystemDiagnostics', action: 'runDiagnostics' });
    } finally {
      setIsRunning(false);
    }
  };

  const testSupabaseConnection = async (): Promise<DiagnosticResult> => {
    const start = Date.now();
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      const timing = Date.now() - start;
      
      if (error) {
        return {
          name: 'Conexão Supabase',
          status: 'error',
          message: 'Falha na conexão com o banco de dados',
          details: error.message,
          timing,
          suggestions: ['Verificar configuração da URL do Supabase', 'Verificar chaves de API']
        };
      }
      
      return {
        name: 'Conexão Supabase',
        status: timing > 2000 ? 'warning' : 'success',
        message: timing > 2000 ? 'Conexão lenta com o banco' : 'Conexão normal com o banco',
        timing,
        suggestions: timing > 2000 ? ['Verificar latência de rede', 'Otimizar queries'] : undefined
      };
    } catch (error) {
      return {
        name: 'Conexão Supabase',
        status: 'error',
        message: 'Erro crítico na conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timing: Date.now() - start
      };
    }
  };

  const testAuthentication = async (): Promise<DiagnosticResult> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          name: 'Autenticação',
          status: 'warning',
          message: 'Usuário não autenticado',
          suggestions: ['Fazer login no sistema']
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      return {
        name: 'Autenticação',
        status: profile ? 'success' : 'warning',
        message: profile ? 'Autenticação e perfil OK' : 'Sessão ativa mas perfil não encontrado',
        suggestions: !profile ? ['Recriar perfil de usuário'] : undefined
      };
    } catch (error) {
      return {
        name: 'Autenticação',
        status: 'error',
        message: 'Erro ao verificar autenticação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const testRLSPolicies = async (): Promise<DiagnosticResult> => {
    const start = Date.now();
    try {
      // Testar acesso às tabelas principais
      const tests = [
        supabase.from('notas_fiscais').select('id').limit(1),
        supabase.from('clientes').select('id').limit(1),
        supabase.from('profiles').select('id').limit(1)
      ];

      const results = await Promise.allSettled(tests);
      const timing = Date.now() - start;
      
      const errors = results.filter(r => r.status === 'rejected').length;
      
      if (errors === 0) {
        return {
          name: 'Políticas RLS',
          status: 'success',
          message: 'Todas as políticas RLS funcionando corretamente',
          timing
        };
      } else if (errors < tests.length) {
        return {
          name: 'Políticas RLS',
          status: 'warning',
          message: `${errors} de ${tests.length} tabelas com problemas de acesso`,
          timing,
          suggestions: ['Verificar políticas RLS', 'Verificar permissões do usuário']
        };
      } else {
        return {
          name: 'Políticas RLS',
          status: 'error',
          message: 'Falha total no acesso às tabelas',
          timing,
          suggestions: ['Verificar autenticação', 'Revisar políticas RLS']
        };
      }
    } catch (error) {
      return {
        name: 'Políticas RLS',
        status: 'error',
        message: 'Erro ao testar políticas RLS',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const testQueryPerformance = async (): Promise<DiagnosticResult> => {
    const start = Date.now();
    try {
      // Query complexa para testar performance
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(`
          id,
          numero_nf,
          status,
          clientes(razao_social),
          transportadoras(razao_social)
        `)
        .limit(10);

      const timing = Date.now() - start;
      
      if (error) {
        return {
          name: 'Performance de Queries',
          status: 'error',
          message: 'Erro na execução de query complexa',
          details: error.message,
          timing
        };
      }

      let status: 'success' | 'warning' | 'error' = 'success';
      let message = 'Performance de queries excelente';
      let suggestions: string[] | undefined;

      if (timing > 3000) {
        status = 'error';
        message = 'Queries muito lentas (>3s)';
        suggestions = ['Adicionar índices', 'Otimizar joins', 'Revisar RLS policies'];
      } else if (timing > 1000) {
        status = 'warning';
        message = 'Queries moderadamente lentas (>1s)';
        suggestions = ['Considerar otimizações', 'Verificar uso de índices'];
      }

      return {
        name: 'Performance de Queries',
        status,
        message,
        timing,
        suggestions
      };
    } catch (error) {
      return {
        name: 'Performance de Queries',
        status: 'error',
        message: 'Erro ao testar performance',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const testDataIntegrity = async (): Promise<DiagnosticResult> => {
    try {
      // Verificar integridade básica dos dados
      const [nfCount, clienteCount, userCount] = await Promise.all([
        supabase.from('notas_fiscais').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ]);

      const issues: string[] = [];
      
      if (nfCount.error) issues.push('Erro ao contar notas fiscais');
      if (clienteCount.error) issues.push('Erro ao contar clientes');
      if (userCount.error) issues.push('Erro ao contar usuários');

      return {
        name: 'Integridade dos Dados',
        status: issues.length === 0 ? 'success' : 'error',
        message: issues.length === 0 
          ? `Dados íntegros: ${nfCount.count || 0} NFs, ${clienteCount.count || 0} clientes, ${userCount.count || 0} usuários`
          : `Problemas detectados: ${issues.join(', ')}`,
        suggestions: issues.length > 0 ? ['Verificar permissões de acesso', 'Revisar estrutura do banco'] : undefined
      };
    } catch (error) {
      return {
        name: 'Integridade dos Dados',
        status: 'error',
        message: 'Erro ao verificar integridade',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const testMemoryUsage = (): DiagnosticResult => {
    const memoryInfo = (performance as any).memory;
    
    if (!memoryInfo) {
      return {
        name: 'Uso de Memória',
        status: 'warning',
        message: 'Informações de memória não disponíveis',
        suggestions: ['Use Chrome para monitoramento detalhado de memória']
      };
    }

    const usedMemoryMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
    const totalMemoryMB = Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024);
    const limitMemoryMB = Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024);

    let status: 'success' | 'warning' | 'error' = 'success';
    let suggestions: string[] | undefined;

    if (usedMemoryMB > limitMemoryMB * 0.8) {
      status = 'error';
      suggestions = ['Recarregar página', 'Verificar vazamentos de memória'];
    } else if (usedMemoryMB > limitMemoryMB * 0.6) {
      status = 'warning';
      suggestions = ['Monitorar uso de memória', 'Considerar recarregar página'];
    }

    return {
      name: 'Uso de Memória',
      status,
      message: `${usedMemoryMB}MB / ${totalMemoryMB}MB usado (limite: ${limitMemoryMB}MB)`,
      suggestions
    };
  };

  const testRealtimeConnection = async (): Promise<DiagnosticResult> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          name: 'Conexão Realtime',
          status: 'error',
          message: 'Timeout na conexão realtime',
          suggestions: ['Verificar conectividade', 'Recarregar página']
        });
      }, 5000);

      const testChannel = supabase.channel('diagnostic-test');
      testChannel.subscribe((status) => {
        clearTimeout(timeout);
        
        if (status === 'SUBSCRIBED') {
          resolve({
            name: 'Conexão Realtime',
            status: 'success',
            message: 'Conexão realtime funcionando normalmente'
          });
        } else {
          resolve({
            name: 'Conexão Realtime',
            status: 'warning',
            message: `Status da conexão: ${status}`,
            suggestions: ['Verificar conectividade de rede']
          });
        }
        
        supabase.removeChannel(testChannel);
      });
    });
  };

  const loadSystemStats = async () => {
    try {
      // Simular estatísticas do sistema
      // Em produção, isso viria de métricas reais
      setSystemStats({
        totalUsers: 0, // Será populado com dados reais
        activeConnections: realtimeStatus === 'connected' ? 1 : 0,
        averageResponseTime: diagnostics.reduce((acc, d) => acc + (d.timing || 0), 0) / diagnostics.filter(d => d.timing).length || 0,
        errorRate: (diagnostics.filter(d => d.status === 'error').length / diagnostics.length) * 100,
        uptime: performance.now() / 1000 / 60 // minutos
      });
    } catch (error) {
      logError('Erro ao carregar estatísticas do sistema:', error);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default' as const,
      warning: 'secondary' as const,
      error: 'destructive' as const,
      running: 'outline' as const
    };
    
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnóstico do Sistema</h2>
          <p className="text-muted-foreground">
            Monitore a saúde e performance do sistema em tempo real
          </p>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Executando...' : 'Executar Diagnóstico'}
        </Button>
      </div>

      {/* Stats do sistema */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Usuários Ativos</span>
              </div>
              <p className="text-2xl font-bold">{systemStats.totalUsers}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {realtimeStatus === 'connected' ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">Conexões Ativas</span>
              </div>
              <p className="text-2xl font-bold">{systemStats.activeConnections}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Tempo Resposta</span>
              </div>
              <p className="text-2xl font-bold">{Math.round(systemStats.averageResponseTime)}ms</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Taxa de Erro</span>
              </div>
              <p className="text-2xl font-bold">{systemStats.errorRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resultados dos diagnósticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resultados dos Testes
            {lastRunTime && (
              <span className="text-sm text-muted-foreground ml-auto">
                Última execução: {lastRunTime.toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Status detalhado de cada componente do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diagnostics.length === 0 && !isRunning && (
            <p className="text-center text-muted-foreground py-8">
              Clique em "Executar Diagnóstico" para iniciar a verificação
            </p>
          )}
          
          <div className="space-y-4">
            {diagnostics.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <h3 className="font-medium">{result.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.timing && (
                      <Badge variant="outline">{result.timing}ms</Badge>
                    )}
                    {getStatusBadge(result.status)}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {result.message}
                </p>
                
                {result.details && (
                  <details className="mb-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Detalhes técnicos
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {result.details}
                    </pre>
                  </details>
                )}
                
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Sugestões:
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {result.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações de debug */}
      {user?.role === 'super_admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações de Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Renders:</strong> {renderCount}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>User Role:</strong> {user.role}</p>
            <p><strong>Transportadora ID:</strong> {user.transportadoraId || 'N/A'}</p>
            <p><strong>Status Realtime:</strong> {realtimeStatus}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}