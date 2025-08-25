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
  Play,
  BookOpen
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="validations">Validações</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="guide">
            <BookOpen className="w-4 h-4 mr-2" />
            Guia
          </TabsTrigger>
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

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  Guia Completo: Desenvolvimento até Publicação Segura
                </CardTitle>
                <CardDescription className="text-lg">
                  Siga este guia para garantir deployments seguros e proteger dados dos usuários
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-6 mt-6">
              {/* Fase 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    🔧 FASE 1: DESENVOLVIMENTO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1.1 Antes de Começar</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>✅ Acesse o ambiente de desenvolvimento (sempre separado da produção)</li>
                      <li>✅ Verifique se você tem backup recente (caso algo dê errado)</li>
                      <li>✅ Documente as mudanças que pretende fazer</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">1.2 Fazendo Mudanças</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>✅ <strong>Mudanças de UI/Frontend</strong>: Totalmente seguras, pode editar livremente</li>
                      <li>✅ <strong>Novas funcionalidades</strong>: Teste localmente primeiro</li>
                      <li>✅ <strong>Mudanças no banco de dados</strong>: Use sempre o sistema de migrações</li>
                      <li>✅ <strong>Novos componentes</strong>: Crie arquivos focados e reutilizáveis</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Fase 2 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    🧪 FASE 2: TESTES E VALIDAÇÃO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">2.1 Testes Locais</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>✅ Teste todas as funcionalidades alteradas</li>
                      <li>✅ Verifique se não quebrou funcionalidades existentes</li>
                      <li>✅ Teste em diferentes dispositivos (mobile/desktop)</li>
                      <li>✅ Verifique console do navegador para erros</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">2.2 Validação de Dados</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>✅ Confirme que dados existentes não foram afetados</li>
                      <li>✅ Teste com dados reais (se possível)</li>
                      <li>✅ Verifique permissões de acesso (RLS policies)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Fase 3 */}
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    🛡️ FASE 3: PRÉ-DEPLOYMENT (CRÍTICO)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-yellow-100 border-yellow-300">
                    <Shield className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Esta é a fase mais importante!</strong> Nunca pule essas verificações.
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h4 className="font-semibold mb-2">3.1 Acesso ao Deployment Seguro</h4>
                    <ol className="space-y-1 text-sm pl-4 list-decimal">
                      <li>Faça login como Super Admin</li>
                      <li>Acesse <code className="bg-gray-100 px-1 rounded">/admin</code></li>
                      <li>Clique na aba "Deployment Seguro" (ícone de escudo 🛡️)</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3.2 Executar Verificações (OBRIGATÓRIO)</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                        <strong>📊 VALIDAÇÃO DE DADOS</strong>
                        <ul className="mt-1 text-sm space-y-1">
                          <li>• Clique em "Executar Validação de Dados"</li>
                          <li>• ✅ Status deve ser "PASSED" para continuar</li>
                          <li>• ❌ Se falhar: NÃO PUBLIQUE - corrija os problemas primeiro</li>
                        </ul>
                      </div>
                      
                      <div className="p-3 bg-purple-50 rounded border-l-4 border-purple-400">
                        <strong>💾 BACKUP DE SEGURANÇA</strong>
                        <ul className="mt-1 text-sm space-y-1">
                          <li>• Clique em "Criar Backup de Segurança"</li>
                          <li>• Digite nome (ex: "pre-deploy-2024-01-15")</li>
                          <li>• ✅ Confirme que backup foi criado com sucesso</li>
                        </ul>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                        <strong>❤️ VERIFICAÇÃO DE SAÚDE</strong>
                        <ul className="mt-1 text-sm space-y-1">
                          <li>• Clique em "Executar Health Check"</li>
                          <li>• ✅ Status deve ser "HEALTHY" ou "WARNING" aceitável</li>
                          <li>• ❌ Se "CRITICAL": NÃO PUBLIQUE - investigue problemas</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-green-100 to-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 text-green-800">🚀 Atalho: Verificação Completa</h4>
                    <p className="text-sm text-green-700">
                      Clique em <strong>"Deployment Seguro"</strong> para executar TODAS as verificações automaticamente!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Fase 4 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    🚀 FASE 4: PUBLICAÇÃO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">4.1 Só Publique Se:</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>✅ Todas as validações passaram</li>
                      <li>✅ Backup foi criado com sucesso</li>
                      <li>✅ Health check está OK</li>
                      <li>✅ Pré-deploy check passou</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">4.2 Como Publicar</h4>
                    <ol className="space-y-1 text-sm pl-4 list-decimal">
                      <li>Clique no botão <strong>"Publish"</strong> (canto superior direito)</li>
                      <li>Confirme a publicação</li>
                      <li>Aguarde o deploy ser concluído</li>
                      <li>Teste rapidamente o sistema em produção</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* Fase 5 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    🚨 FASE 5: PÓS-DEPLOY
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">5.1 Verificação Pós-Deploy</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>✅ Acesse o sistema publicado e teste funcionalidades críticas</li>
                      <li>✅ Monitore logs por alguns minutos (aba "Logs" no admin)</li>
                      <li>✅ Verifique se usuários conseguem acessar normalmente</li>
                      <li>✅ Teste principais fluxos do sistema</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">5.2 Em Caso de Problemas</h4>
                    <ul className="space-y-1 text-sm pl-4">
                      <li>😌 NÃO ENTRE EM PÂNICO</li>
                      <li>📋 Acesse Deployment Seguro &gt; Backups</li>
                      <li>⏮️ Use o backup criado para restaurar se necessário</li>
                      <li>📞 Contacte suporte se problemas persistirem</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Regras de Ouro */}
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    🎯 REGRAS DE OURO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-green-700">✅ SEMPRE FAÇA:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Backup antes de publicar</li>
                        <li>• Execute validações completas</li>
                        <li>• Teste localmente primeiro</li>
                        <li>• Use o sistema de deployment seguro</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-red-700">❌ NUNCA FAÇA:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Publique sem verificações de segurança</li>
                        <li>• Ignore erros de validação</li>
                        <li>• Publique com health check "CRITICAL"</li>
                        <li>• Modifique dados diretamente em produção</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}