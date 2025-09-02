/**
 * Debug Log Viewer - Real-time debugging interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bug, Download, Trash2, Play, Pause, RefreshCw, 
  AlertTriangle, AlertCircle, Info, Zap 
} from 'lucide-react';
import { advancedDebugLogger } from '@/utils/advancedDebugLogger';

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  category: string;
  message: string;
  data?: any;
}

export default function DebugLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshLogs = () => {
    const allLogs = advancedDebugLogger.getAllLogs();
    const debugReport = advancedDebugLogger.getDebugReport();
    setLogs(allLogs);
    setReport(debugReport);
  };

  useEffect(() => {
    refreshLogs();
    
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleExportLogs = () => {
    advancedDebugLogger.exportLogs();
  };

  const handleClearLogs = () => {
    advancedDebugLogger.clearLogs();
    refreshLogs();
  };

  const handleToggleCapture = () => {
    if (isCapturing) {
      advancedDebugLogger.pauseCapture();
    } else {
      advancedDebugLogger.resumeCapture();
    }
    setIsCapturing(!isCapturing);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <Zap className="h-4 w-4 text-red-600" />;
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO': return <Info className="h-4 w-4 text-blue-500" />;
      case 'DEBUG': return <Bug className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR': return 'bg-red-50 text-red-700 border-red-100';
      case 'WARN': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'INFO': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'DEBUG': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const renderLogEntry = (log: LogEntry, index: number) => (
    <div key={index} className={`p-3 border rounded-lg ${getLevelColor(log.level)} mb-2`}>
      <div className="flex items-start gap-2">
        {getLevelIcon(log.level)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {log.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(log.timestamp)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {log.level}
            </Badge>
          </div>
          <div className="text-sm font-medium mb-1">
            {log.message}
          </div>
          {log.data && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ver dados ({Object.keys(log.data).length} propriedades)
              </summary>
              <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Debug Log Viewer</h1>
              <p className="text-muted-foreground">
                Monitoramento em tempo real de todos os eventos do sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? 'Pausar' : 'Retomar'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCapture}
            >
              {isCapturing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isCapturing ? 'Pausar Captura' : 'Retomar Captura'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={refreshLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            
            <Button variant="destructive" size="sm" onClick={handleClearLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalLogs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-600" />
                  Críticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{report.summary.criticals}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Erros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{report.summary.errors}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Avisos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{report.summary.warnings}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.snapshots}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different views */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todos os Logs</TabsTrigger>
            <TabsTrigger value="errors">Erros</TabsTrigger>
            <TabsTrigger value="critical">Críticos</TabsTrigger>
            <TabsTrigger value="network">Rede</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="snapshot">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Logs ({logs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum log capturado ainda
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(-50).reverse().map(renderLogEntry)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Erro</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs.filter(log => log.level === 'ERROR').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum erro capturado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.filter(log => log.level === 'ERROR').slice(-30).reverse().map(renderLogEntry)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="critical">
            <Card>
              <CardHeader>
                <CardTitle>Logs Críticos</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs.filter(log => log.level === 'CRITICAL').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum erro crítico capturado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.filter(log => log.level === 'CRITICAL').slice(-30).reverse().map(renderLogEntry)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network">
            <Card>
              <CardHeader>
                <CardTitle>Atividade de Rede</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs.filter(log => log.category === 'NETWORK').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma atividade de rede capturada
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.filter(log => log.category === 'NETWORK').slice(-30).reverse().map(renderLogEntry)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="react">
            <Card>
              <CardHeader>
                <CardTitle>Logs do React</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs.filter(log => log.category === 'REACT').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum log do React capturado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.filter(log => log.category === 'REACT').slice(-30).reverse().map(renderLogEntry)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Autenticação</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs.filter(log => log.category === 'AUTH').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum log de autenticação capturado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.filter(log => log.category === 'AUTH').slice(-30).reverse().map(renderLogEntry)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="snapshot">
            <Card>
              <CardHeader>
                <CardTitle>Sistema & Snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {report?.latestSnapshot ? (
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Último Snapshot do Sistema:</div>
                      <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                        {JSON.stringify(report.latestSnapshot, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum snapshot disponível
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}