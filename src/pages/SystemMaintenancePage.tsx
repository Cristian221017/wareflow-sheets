// Página principal de manutenção do sistema
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Code, 
  Database, 
  Settings, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Monitor
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemHealthDashboard } from '@/components/system/SystemHealthDashboard';
import { CodeCleanupTools } from '@/components/system/CodeCleanupTools';
import { DiagnosticPage } from '@/components/system/DiagnosticPage';
import { useLogger } from '@/utils/logger';

export default function SystemMaintenancePage() {
  const navigate = useNavigate();
  const logger = useLogger();

  const clearAllLogs = () => {
    logger.clearLogs();
    logger.log('🧹 Todos os logs foram limpos pelo usuário');
  };

  const exportSystemLogs = () => {
    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.log('📦 Logs do sistema exportados');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Maintenance</h1>
              <p className="text-xl text-muted-foreground">
                Central de manutenção e monitoramento do sistema
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearAllLogs}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Limpar Logs
              </Button>
              <Button variant="outline" onClick={exportSystemLogs}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar Logs
              </Button>
              <Button onClick={() => navigate('/')}>
                Voltar ao Sistema
              </Button>
            </div>
          </div>

          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-semibold">Healthy</span>
                    </div>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Database</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-semibold">Connected</span>
                    </div>
                  </div>
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Code Quality</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">Checking...</Badge>
                    </div>
                  </div>
                  <Code className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Security</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-semibold">Secure</span>
                    </div>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Code Cleanup
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              System Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="cleanup">
            <CodeCleanupTools />
          </TabsContent>

          <TabsContent value="diagnostic">
            <DiagnosticPage />
          </TabsContent>

          <TabsContent value="logs">
            <SystemLogsViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Component para visualizar logs do sistema
function SystemLogsViewer() {
  const logger = useLogger();
  const [selectedLevel, setSelectedLevel] = React.useState<'INFO' | 'WARN' | 'ERROR' | undefined>();

  const logs = selectedLevel ? logger.getLogs(selectedLevel) : logger.getLogs();
  const recentLogs = logger.getRecentLogs(30); // Últimos 30 minutos

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Logs</h2>
          <p className="text-muted-foreground">
            Visualize e gerencie logs do sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={selectedLevel === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel(undefined)}
          >
            Todos ({logger.getLogs().length})
          </Button>
          <Button 
            variant={selectedLevel === 'INFO' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel('INFO')}
          >
            Info ({logger.getLogs('INFO').length})
          </Button>
          <Button 
            variant={selectedLevel === 'WARN' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel('WARN')}
          >
            Warn ({logger.getLogs('WARN').length})
          </Button>
          <Button 
            variant={selectedLevel === 'ERROR' ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel('ERROR')}
          >
            Error ({logger.getLogs('ERROR').length})
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente (30 min)</CardTitle>
            <CardDescription>
              {recentLogs.length} eventos nos últimos 30 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma atividade recente
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentLogs.slice(0, 10).map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        log.level === 'ERROR' ? 'destructive' : 
                        log.level === 'WARN' ? 'default' : 
                        'secondary'
                      }>
                        {log.level}
                      </Badge>
                      <span className="text-sm">{log.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Todos os Logs {selectedLevel && `(${selectedLevel})`}
            </CardTitle>
            <CardDescription>
              {logs.length} entradas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum log encontrado para o filtro selecionado
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          log.level === 'ERROR' ? 'destructive' : 
                          log.level === 'WARN' ? 'default' : 
                          'secondary'
                        }>
                          {log.level}
                        </Badge>
                        {log.source && (
                          <Badge variant="outline" className="text-xs">
                            {log.source}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    
                    <p className="text-sm">{log.message}</p>
                    
                    {log.meta && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          Metadata
                        </summary>
                        <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}