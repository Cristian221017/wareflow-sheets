// Ferramentas de limpeza e manutenção do código
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Code, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  FileText, 
  Search,
  RefreshCcw
} from 'lucide-react';
import { useCodeIntegrityChecker, type IntegrityReport, type CodeIssue } from '@/utils/codeIntegrityChecker';
import { useLogger } from '@/utils/logger';

export function CodeCleanupTools() {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  
  const checker = useCodeIntegrityChecker();
  const logger = useLogger();

  const runIntegrityCheck = async () => {
    setLoading(true);
    try {
      logger.log('🔍 Iniciando verificação de integridade do código...');
      const result = await checker.runIntegrityCheck();
      setReport(result);
      logger.log('✅ Verificação de integridade concluída', result.summary);
    } catch (error) {
      logger.error('❌ Erro na verificação de integridade:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoFixIssues = async () => {
    if (!report) return;

    setAutoFixing(true);
    try {
      logger.log('🔧 Iniciando auto-fix de issues...');
      const result = await checker.autoFix(report.issues);
      logger.log(`✅ Auto-fix concluído: ${result.fixed} corrigidos, ${result.failed} falharam`);
      
      // Re-run check after auto-fix
      await runIntegrityCheck();
    } catch (error) {
      logger.error('❌ Erro no auto-fix:', error);
    } finally {
      setAutoFixing(false);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'security':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'performance':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Code className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Code Cleanup Tools</h1>
          <p className="text-muted-foreground">
            Ferramentas para manutenção e limpeza de código
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={runIntegrityCheck}
            disabled={loading}
            size="sm"
          >
            <Search className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Verificar Código
          </Button>
          
          {report && report.issues.some(i => i.autoFixable) && (
            <Button
              onClick={autoFixIssues}
              disabled={autoFixing}
              variant="outline"
              size="sm"
            >
              <Wrench className={`h-4 w-4 mr-2 ${autoFixing ? 'animate-spin' : ''}`} />
              Auto-Fix
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Integridade
            </CardTitle>
            <CardDescription>
              Verificação executada em {new Date(report.timestamp).toLocaleString('pt-BR')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{report.summary.totalIssues}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {report.summary.criticalIssues}
                </div>
                <div className="text-sm text-muted-foreground">Crítico</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {report.summary.highIssues}
                </div>
                <div className="text-sm text-muted-foreground">Alto</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {report.summary.mediumIssues}
                </div>
                <div className="text-sm text-muted-foreground">Médio</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {report.summary.lowIssues}
                </div>
                <div className="text-sm text-muted-foreground">Baixo</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues Details */}
      {report && (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Todos ({report.issues.length})
            </TabsTrigger>
            <TabsTrigger value="critical">
              Crítico ({report.summary.criticalIssues})
            </TabsTrigger>
            <TabsTrigger value="high">
              Alto ({report.summary.highIssues})
            </TabsTrigger>
            <TabsTrigger value="autofix">
              Auto-fix ({report.issues.filter(i => i.autoFixable).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <IssuesList issues={report.issues} />
          </TabsContent>

          <TabsContent value="critical">
            <IssuesList issues={report.issues.filter(i => i.severity === 'critical')} />
          </TabsContent>

          <TabsContent value="high">
            <IssuesList issues={report.issues.filter(i => i.severity === 'high')} />
          </TabsContent>

          <TabsContent value="autofix">
            <IssuesList issues={report.issues.filter(i => i.autoFixable)} />
          </TabsContent>
        </Tabs>
      )}

      {/* No Report State */}
      {!report && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verificação de Código</h3>
              <p className="mb-4">
                Execute uma verificação de integridade para identificar problemas no código
              </p>
              <Button onClick={runIntegrityCheck} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Iniciar Verificação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Component for displaying list of issues
function IssuesList({ issues }: { issues: CodeIssue[] }) {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'security':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'performance':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Code className="h-4 w-4 text-blue-500" />;
    }
  };

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            Nenhum problema encontrado nesta categoria
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(issue.type)}
                  <span className="text-sm font-medium">{issue.file}</span>
                  {issue.line && (
                    <Badge variant="outline" className="text-xs">
                      Line {issue.line}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(issue.severity) as any}>
                    {issue.severity}
                  </Badge>
                  {issue.autoFixable && (
                    <Badge variant="outline" className="text-xs">
                      <Wrench className="h-3 w-3 mr-1" />
                      Auto-fix
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{issue.message}</p>
                
                {issue.suggestion && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    <strong>Sugestão:</strong> {issue.suggestion}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}