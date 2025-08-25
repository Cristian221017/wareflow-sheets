import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Download,
  Play
} from 'lucide-react';
import { useDeploymentSafety } from '@/hooks/useDeploymentSafety';
import { FeatureFlagsManager } from './FeatureFlagsManager';
import { SafeDeploymentDialog } from './SafeDeploymentDialog';

export function DeploymentSafetyDashboard() {
  const {
    validations,
    backups,
    healthChecks,
    loading,
    isSuperAdmin,
    runDataValidation,
    createBackup,
    runHealthCheck,
    runPreDeploymentCheck,
    refreshData
  } = useDeploymentSafety();

  const [isRunningValidation, setIsRunningValidation] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [showSafeDeployment, setShowSafeDeployment] = useState(false);

  const handleRunValidation = async () => {
    setIsRunningValidation(true);
    try {
      await runDataValidation();
    } finally {
      setIsRunningValidation(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const backupName = `manual-backup-${new Date().toISOString().split('T')[0]}`;
      await createBackup(backupName);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    try {
      await runHealthCheck();
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
      case 'completed':
      case 'healthy':
        return <Badge variant="default" className="bg-green-500 text-white">✓ {status}</Badge>;
      case 'failed':
      case 'critical':
        return <Badge variant="destructive">✗ {status}</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">⚠ {status}</Badge>;
      case 'running':
      case 'creating':
        return <Badge variant="outline">⏳ {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const latestHealthCheck = healthChecks[0];
  const systemStatus = latestHealthCheck?.status || 'unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Sistema de Deployment Seguro
          </h1>
          <p className="text-muted-foreground">
            Gerencie deployments com segurança e proteja dados de usuários
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <SafeDeploymentDialog
            open={showSafeDeployment}
            onOpenChange={setShowSafeDeployment}
            onRunPreDeploymentCheck={runPreDeploymentCheck}
          />
          
          <Button
            onClick={() => setShowSafeDeployment(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <Play className="w-4 h-4 mr-2" />
            Deployment Seguro
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {latestHealthCheck && (
        <Alert className={
          systemStatus === 'healthy' ? 'border-green-500 bg-green-50' :
          systemStatus === 'warning' ? 'border-yellow-500 bg-yellow-50' : 
          systemStatus === 'critical' ? 'border-red-500 bg-red-50' : ''
        }>
          <Activity className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Status do Sistema: {getStatusBadge(systemStatus)}
              {latestHealthCheck.message && ` - ${latestHealthCheck.message}`}
            </span>
            <span className="text-sm text-muted-foreground">
              Última verificação: {new Date(latestHealthCheck.created_at).toLocaleString()}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="validations">Validações</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validações Recentes</CardTitle>
                <Database className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {validations.filter(v => v.status === 'passed').length}/
                  {validations.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  validações aprovadas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={handleRunValidation}
                  disabled={isRunningValidation}
                >
                  <Database className="w-4 h-4 mr-2" />
                  {isRunningValidation ? 'Validando...' : 'Executar Validação'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Backups</CardTitle>
                <Download className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {backups.filter(b => b.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  backups completados
                </p>
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isCreatingBackup ? 'Criando...' : 'Criar Backup'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Checks</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthChecks.filter(h => h.status === 'healthy').length}/
                  {healthChecks.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  verificações saudáveis
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={handleRunHealthCheck}
                  disabled={isRunningHealthCheck}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  {isRunningHealthCheck ? 'Verificando...' : 'Verificar Saúde'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Validations Tab */}
        <TabsContent value="validations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validações de Integridade</CardTitle>
              <CardDescription>
                Histórico de validações de integridade dos dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma validação executada ainda
                </p>
              ) : (
                validations.map((validation) => (
                  <div key={validation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{validation.validation_type}</span>
                        {getStatusBadge(validation.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(validation.created_at).toLocaleString()}
                      </p>
                      {validation.result && (
                        <p className="text-sm mt-1">
                          Problemas encontrados: {validation.result.orphaned_nfs || 0} NFs órfãs, {validation.result.invalid_statuses || 0} status inválidos
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backups de Segurança</CardTitle>
              <CardDescription>
                Histórico de backups do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSuperAdmin ? (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Apenas super administradores podem visualizar e gerenciar backups.
                  </AlertDescription>
                </Alert>
              ) : backups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum backup criado ainda
                </p>
              ) : (
                backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{backup.name}</span>
                        {getStatusBadge(backup.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(backup.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm mt-1">
                        Tabelas: {backup.tables_backed_up.join(', ')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento de Saúde</CardTitle>
              <CardDescription>
                Histórico de verificações de saúde do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthChecks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma verificação de saúde executada ainda
                </p>
              ) : (
                healthChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{check.check_type}</span>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(check.created_at).toLocaleString()}
                      </p>
                      {check.message && (
                        <p className="text-sm mt-1">{check.message}</p>
                      )}
                      {check.metrics && (
                        <div className="text-sm mt-2 grid grid-cols-3 gap-4">
                          <span>Usuários: {check.metrics.total_users}</span>
                          <span>Notas Fiscais: {check.metrics.total_nfs}</span>
                          <span>Erros Recentes: {check.metrics.recent_errors}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features" className="space-y-4">
          <FeatureFlagsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}