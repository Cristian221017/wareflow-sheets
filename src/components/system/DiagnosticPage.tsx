import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { systemDiagnostic, type DiagnosticResult } from '@/utils/systemDiagnostic';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function DiagnosticPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const diagnosticResults = await systemDiagnostic.runFullDiagnostic(user?.id);
      setResults(diagnosticResults);
    } catch (error) {
      console.error('Diagnostic failed:', error);
      toast.error('Falha ao executar diagnóstico');
    } finally {
      setIsRunning(false);
    }
  };

  const copyResults = () => {
    const resultsText = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(resultsText);
    toast.success('Resultados copiados para área de transferência');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'PASS' ? 'default' : status === 'FAIL' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  // Run diagnostic on component mount
  useEffect(() => {
    runDiagnostic();
  }, []);

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground">
            Verificação completa do estado do sistema WMS
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={copyResults}
            variant="outline"
            disabled={results.length === 0}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Resultados
          </Button>
          <Button
            onClick={runDiagnostic}
            disabled={isRunning}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Sucessos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Avisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warnCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Current User Info */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Usuário Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Nome:</strong> {user.name}</div>
              <div><strong>Tipo:</strong> {user.type}</div>
              {user.role && <div><strong>Role:</strong> {user.role}</div>}
              {user.transportadoraId && <div><strong>Transportadora ID:</strong> {user.transportadoraId}</div>}
              {user.clienteId && <div><strong>Cliente ID:</strong> {user.clienteId}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados Detalhados</CardTitle>
          <CardDescription>
            Resultados de todos os testes executados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRunning ? 'Executando diagnóstico...' : 'Nenhum resultado disponível'}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.test}</span>
                        {getStatusBadge(result.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {result.message}
                    </p>
                    
                    {result.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                        <p className="text-xs text-red-600 font-mono">
                          <strong>Erro:</strong> {result.error}
                        </p>
                      </div>
                    )}
                    
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver dados detalhados
                        </summary>
                        <pre className="bg-muted p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}