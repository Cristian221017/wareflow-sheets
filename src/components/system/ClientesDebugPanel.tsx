import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientesDebugPanel() {
  const { user } = useAuth();
  const { clientes, loading, error, refetch } = useClientes();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runDiagnostics = async () => {
    setTesting(true);
    const results = [];

    try {
      // Test 1: Check user context
      results.push({
        test: 'User Context',
        status: user ? 'pass' : 'fail',
        details: user ? {
          type: user.type,
          transportadoraId: user.transportadoraId,
          email: user.email,
          name: user.name
        } : 'No user found'
      });

      // Test 2: Check transportadora access
      if (user?.transportadoraId) {
        const { data: transportadora, error: transpError } = await supabase
          .from('transportadoras')
          .select('id, razao_social, status')
          .eq('id', user.transportadoraId)
          .single();

        results.push({
          test: 'Transportadora Access',
          status: transpError ? 'fail' : 'pass',
          details: transpError ? transpError.message : transportadora
        });
      }

      // Test 3: Direct clientes query
      if (user?.transportadoraId) {
        const { data: directClientes, error: directError } = await supabase
          .from('clientes')
          .select('id, razao_social, cnpj, status, transportadora_id')
          .eq('transportadora_id', user.transportadoraId);

        results.push({
          test: 'Direct Clientes Query',
          status: directError ? 'fail' : 'pass',
          details: directError ? directError.message : {
            count: directClientes?.length || 0,
            clientes: directClientes
          }
        });
      }

      // Test 4: Direct clientes query test
      if (user?.transportadoraId) {
        const { data: directClientes, error: directError } = await supabase
          .from('clientes')
          .select('id, razao_social, cnpj, status, transportadora_id')
          .eq('transportadora_id', user.transportadoraId);

        results.push({
          test: 'Direct Clientes Query Test',
          status: directError ? 'fail' : 'pass',
          details: directError ? directError.message : {
            count: directClientes?.length || 0,
            clientes: directClientes
          }
        });
      }

      // Test 5: User permissions
      const { data: userPerms, error: permsError } = await supabase
        .from('user_transportadoras')
        .select('*')
        .eq('user_id', user?.id);

      results.push({
        test: 'User Permissions',
        status: permsError ? 'fail' : 'pass',
        details: permsError ? permsError.message : userPerms
      });

    } catch (err) {
      results.push({
        test: 'Diagnostic Error',
        status: 'fail',
        details: err
      });
    } finally {
      setTestResults(results);
      setTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Clientes Debug Panel</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refetch
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runDiagnostics}
              disabled={testing}
            >
              <AlertTriangle className={`h-4 w-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
              Run Diagnostics
            </Button>
          </div>
        </div>
        <CardDescription>
          Debug information for client loading issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Clientes Loaded</div>
            <div className="text-2xl font-bold">{clientes.length}</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Loading State</div>
            <Badge variant={loading ? 'secondary' : 'outline'}>
              {loading ? 'Loading...' : 'Loaded'}
            </Badge>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Error Status</div>
            <Badge variant={error ? 'destructive' : 'default'}>
              {error ? 'Error' : 'OK'}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* User Context */}
        <div>
          <h4 className="font-medium mb-2">User Context:</h4>
          <div className="text-sm bg-muted p-3 rounded-md font-mono">
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </div>
        </div>

        {/* Clientes List */}
        {clientes.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Loaded Clientes ({clientes.length}):</h4>
            <div className="space-y-2">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="p-2 border rounded-md text-sm">
                  <div className="font-medium">{cliente.name}</div>
                  <div className="text-muted-foreground">CNPJ: {cliente.cnpj}</div>
                  <div className="text-muted-foreground text-xs">ID: {cliente.id}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostic Results */}
        {testResults.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Diagnostic Results:</h4>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{result.test}</span>
                      <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                        {result.status === 'pass' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {result.status}
                      </Badge>
                    </div>
                    <div className="text-sm bg-muted p-2 rounded font-mono">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}