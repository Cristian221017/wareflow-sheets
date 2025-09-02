import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMemoryLeakDetection } from '@/hooks/useMemoryLeak';
import { log, warn } from '@/utils/logger';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  HardDrive,
  Zap,
  TrendingDown,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  history: number[];
}

interface ComponentMetric {
  name: string;
  renders: number;
  avgRenderTime: number;
  memoryUsage: number;
  lastActivity: Date;
}

export function PerformanceMonitor() {
  const { addSubscription } = useMemoryLeakDetection('PerformanceMonitor');
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [componentMetrics, setComponentMetrics] = useState<ComponentMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  const startMonitoring = () => {
    if (intervalRef.current) return;
    
    setIsMonitoring(true);
    
    // Coleta inicial
    collectMetrics();
    
    // Coleta periódica
    intervalRef.current = setInterval(collectMetrics, 5000);
    
    addSubscription(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    });
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    setIsMonitoring(false);
  };

  const collectMetrics = async () => {
    const newMetrics: PerformanceMetric[] = [];
    
    // 1. Métricas de memória
    const memoryMetric = getMemoryMetrics();
    if (memoryMetric) newMetrics.push(memoryMetric);
    
    // 2. Métricas de performance de navegação
    const navigationMetric = getNavigationMetrics();
    if (navigationMetric) newMetrics.push(navigationMetric);
    
    // 3. Métricas de FPS/animações
    const fpsMetric = await getFPSMetrics();
    if (fpsMetric) newMetrics.push(fpsMetric);
    
    // 4. Métricas de rede
    const networkMetric = getNetworkMetrics();
    if (networkMetric) newMetrics.push(networkMetric);
    
    // 5. Métricas de DOM
    const domMetric = getDOMMetrics();
    if (domMetric) newMetrics.push(domMetric);

    setMetrics(prevMetrics => {
      return newMetrics.map(newMetric => {
        const existing = prevMetrics.find(m => m.name === newMetric.name);
        if (existing) {
          const history = [...existing.history, newMetric.value].slice(-20); // Manter apenas últimos 20 valores
          const trend = getTrend(history);
          return {
            ...newMetric,
            history,
            trend
          };
        }
        return {
          ...newMetric,
          history: [newMetric.value]
        };
      });
    });

    // Coleta métricas de componentes React (simulado)
    updateComponentMetrics();
  };

  const getMemoryMetrics = (): PerformanceMetric | null => {
    const memoryInfo = (performance as any).memory;
    if (!memoryInfo) return null;

    const usedMemoryMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
    const limitMemoryMB = Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024);
    const usagePercent = (usedMemoryMB / limitMemoryMB) * 100;

    let status: 'good' | 'warning' | 'critical' = 'good';
    if (usagePercent > 80) status = 'critical';
    else if (usagePercent > 60) status = 'warning';

    return {
      name: 'Uso de Memória',
      value: usedMemoryMB,
      unit: 'MB',
      status,
      history: []
    };
  };

  const getNavigationMetrics = (): PerformanceMetric | null => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return null;

    const loadTime = navigation.loadEventEnd - navigation.fetchStart;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (loadTime > 3000) status = 'critical';
    else if (loadTime > 1000) status = 'warning';

    return {
      name: 'Tempo de Carregamento',
      value: Math.round(loadTime),
      unit: 'ms',
      status,
      history: []
    };
  };

  const getFPSMetrics = async (): Promise<PerformanceMetric | null> => {
    return new Promise((resolve) => {
      let lastTime = performance.now();
      let frames = 0;
      
      const measureFPS = () => {
        frames++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          const fps = Math.round((frames * 1000) / (currentTime - lastTime));
          
          let status: 'good' | 'warning' | 'critical' = 'good';
          if (fps < 30) status = 'critical';
          else if (fps < 45) status = 'warning';
          
          resolve({
            name: 'FPS',
            value: fps,
            unit: 'fps',
            status,
            history: []
          });
          return;
        }
        
        requestAnimationFrame(measureFPS);
      };
      
      requestAnimationFrame(measureFPS);
      
      // Timeout para evitar loop infinito
      setTimeout(() => resolve(null), 2000);
    });
  };

  const getNetworkMetrics = (): PerformanceMetric | null => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const recentResources = resources.filter(r => 
      performance.now() - r.startTime < 30000 // Últimos 30 segundos
    );

    if (recentResources.length === 0) return null;

    const avgDuration = recentResources.reduce((acc, r) => acc + r.duration, 0) / recentResources.length;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (avgDuration > 2000) status = 'critical';
    else if (avgDuration > 500) status = 'warning';

    return {
      name: 'Requisições de Rede',
      value: Math.round(avgDuration),
      unit: 'ms',
      status,
      history: []
    };
  };

  const getDOMMetrics = (): PerformanceMetric => {
    const nodeCount = document.querySelectorAll('*').length;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (nodeCount > 5000) status = 'critical';
    else if (nodeCount > 2000) status = 'warning';

    return {
      name: 'Elementos DOM',
      value: nodeCount,
      unit: 'nodes',
      status,
      history: []
    };
  };

  const getTrend = (history: number[]): 'up' | 'down' | 'stable' => {
    if (history.length < 3) return 'stable';
    
    const recent = history.slice(-3);
    const increasing = recent[2] > recent[0];
    const decreasing = recent[2] < recent[0];
    const change = Math.abs(recent[2] - recent[0]) / recent[0];
    
    if (change < 0.05) return 'stable'; // Menos de 5% de mudança
    return increasing ? 'up' : 'down';
  };

  const updateComponentMetrics = () => {
    // Simulação de métricas de componentes React
    // Em uma implementação real, isso seria coletado via profiler do React
    const mockComponents: ComponentMetric[] = [
      {
        name: 'WMSMain',
        renders: Math.floor(Math.random() * 100),
        avgRenderTime: Math.random() * 10,
        memoryUsage: Math.random() * 5,
        lastActivity: new Date()
      },
      {
        name: 'ClienteDashboard',
        renders: Math.floor(Math.random() * 50),
        avgRenderTime: Math.random() * 15,
        memoryUsage: Math.random() * 3,
        lastActivity: new Date()
      },
      {
        name: 'RealtimeProvider',
        renders: Math.floor(Math.random() * 20),
        avgRenderTime: Math.random() * 5,
        memoryUsage: Math.random() * 2,
        lastActivity: new Date()
      }
    ];
    
    setComponentMetrics(mockComponents);
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Performance</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho da aplicação em tempo real
          </p>
        </div>
        <Button 
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          variant={isMonitoring ? "destructive" : "default"}
          className="flex items-center gap-2"
        >
          {isMonitoring ? (
            <>
              <Activity className="w-4 h-4" />
              Parar Monitoramento
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Iniciar Monitoramento
            </>
          )}
        </Button>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  <Badge 
                    variant={
                      metric.status === 'good' ? 'default' : 
                      metric.status === 'warning' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {metric.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="text-2xl font-bold">
                {metric.value} <span className="text-sm text-muted-foreground">{metric.unit}</span>
              </div>
              
              {metric.history.length > 1 && (
                <div className="mt-2">
                  <div className="h-8 flex items-end gap-1">
                    {metric.history.slice(-10).map((value, i) => {
                      const maxValue = Math.max(...metric.history);
                      const height = Math.max(2, (value / maxValue) * 32);
                      return (
                        <div
                          key={i}
                          className="bg-primary/20 rounded-sm flex-1"
                          style={{ height: `${height}px` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas de componentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            Performance de Componentes
          </CardTitle>
          <CardDescription>
            Métricas detalhadas dos componentes React
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {componentMetrics.map((component, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{component.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    Última atividade: {component.lastActivity.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Renders: </span>
                    <span className="font-medium">{component.renders}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tempo médio: </span>
                    <span className="font-medium">{component.avgRenderTime.toFixed(1)}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Memória: </span>
                    <span className="font-medium">{component.memoryUsage.toFixed(1)}MB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status do monitoramento */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {isMonitoring ? (
              <>
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                <span className="text-green-500 font-medium">Monitoramento Ativo</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-muted-foreground">Monitoramento Pausado</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}