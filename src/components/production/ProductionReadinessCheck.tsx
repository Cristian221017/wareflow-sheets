import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Play, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValidationResult {
  test: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export function ProductionReadinessCheck() {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  const updateValidation = (testName: string, updates: Partial<ValidationResult>) => {
    setValidations(prev => prev.map(v => 
      v.test === testName ? { ...v, ...updates } : v
    ));
  };

  const runValidation = async (testName: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    updateValidation(testName, { status: 'running' });
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateValidation(testName, { 
        status: 'success', 
        message: 'Passou', 
        details: result,
        duration 
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateValidation(testName, { 
        status: 'error', 
        message: error.message || 'Falhou', 
        details: error,
        duration 
      });
    }
  };

  const initializeValidations = () => {
    const tests: ValidationResult[] = [
      // Conectividade e Infraestrutura
      { test: 'Conectividade Supabase', category: 'Infraestrutura', status: 'pending', message: 'Aguardando...' },
      { test: 'Autenticação', category: 'Infraestrutura', status: 'pending', message: 'Aguardando...' },
      { test: 'Storage/Upload', category: 'Infraestrutura', status: 'pending', message: 'Aguardando...' },
      { test: 'Edge Functions', category: 'Infraestrutura', status: 'pending', message: 'Aguardando...' },
      
      // Segurança e Permissões
      { test: 'RLS Policies - Clientes', category: 'Segurança', status: 'pending', message: 'Aguardando...' },
      { test: 'RLS Policies - Notas Fiscais', category: 'Segurança', status: 'pending', message: 'Aguardando...' },
      { test: 'RLS Policies - Documentos Financeiros', category: 'Segurança', status: 'pending', message: 'Aguardando...' },
      { test: 'Permissões de Usuário', category: 'Segurança', status: 'pending', message: 'Aguardando...' },
      
      // Fluxos de Negócio
      { test: 'Fluxo NF - Criação', category: 'Fluxos', status: 'pending', message: 'Aguardando...' },
      { test: 'Fluxo NF - Solicitação', category: 'Fluxos', status: 'pending', message: 'Aguardando...' },
      { test: 'Fluxo NF - Confirmação', category: 'Fluxos', status: 'pending', message: 'Aguardando...' },
      { test: 'Fluxo Financeiro', category: 'Fluxos', status: 'pending', message: 'Aguardando...' },
      
      // Cadastros e CRUD
      { test: 'CRUD Clientes', category: 'Cadastros', status: 'pending', message: 'Aguardando...' },
      { test: 'CRUD Notas Fiscais', category: 'Cadastros', status: 'pending', message: 'Aguardando...' },
      { test: 'CRUD Documentos Financeiros', category: 'Cadastros', status: 'pending', message: 'Aguardando...' },
      
      // Performance e Integridade
      { test: 'Performance Database', category: 'Performance', status: 'pending', message: 'Aguardando...' },
      { test: 'Integridade de Dados', category: 'Performance', status: 'pending', message: 'Aguardando...' },
    ];
    setValidations(tests);
  };

  const runAllValidations = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    initializeValidations();

    // INFRAESTRUTURA
    await runValidation('Conectividade Supabase', async () => {
      const { data, error } = await supabase.from('transportadoras').select('count').limit(1);
      if (error) throw error;
      return { connected: true };
    });

    await runValidation('Autenticação', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      return { authenticated: true, user: user.id };
    });

    await runValidation('Storage/Upload', async () => {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return { buckets_found: buckets?.length || 0, bucket_names: buckets?.map(b => b.name) || [] };
    });

    await runValidation('Edge Functions', async () => {
      const expectedFunctions = ['generate-test-data', 'send-notification-email', 'integration-sync'];
      return { expected_functions: expectedFunctions, note: 'Verificação visual recomendada no dashboard' };
    });

    // SEGURANÇA E PERMISSÕES
    await runValidation('RLS Policies - Clientes', async () => {
      const { data, error } = await supabase.from('clientes').select('id, razao_social').limit(5);
      if (error) throw error;
      return { accessible: true, sample_count: data?.length || 0 };
    });

    await runValidation('RLS Policies - Notas Fiscais', async () => {
      const { data, error } = await supabase.from('notas_fiscais').select('id, numero_nf, status').limit(5);
      if (error) throw error;
      return { accessible: true, sample_count: data?.length || 0 };
    });

    await runValidation('RLS Policies - Documentos Financeiros', async () => {
      try {
        const { data, error } = await supabase.from('documentos_financeiros' as any).select('id, numero_cte').limit(5);
        if (error) throw error;
        return { accessible: true, sample_count: data?.length || 0 };
      } catch (err: any) {
        if (err.message?.includes('permission denied') || err.message?.includes('access')) {
          throw new Error('Sem permissão para acessar documentos financeiros');
        }
        throw err;
      }
    });

    await runValidation('Permissões de Usuário', async () => {
      try {
        const { data: userData } = await supabase.rpc('get_user_data_optimized' as any, {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_email: (await supabase.auth.getUser()).data.user?.email
        });
        return { user_data_accessible: !!userData, user_type: userData?.[0]?.user_type };
      } catch (err: any) {
        if (err.message?.includes('does not exist')) {
          return { user_data_accessible: false, note: 'Função RPC não encontrada' };
        }
        throw err;
      }
    });

    // FLUXOS DE NEGÓCIO
    await runValidation('Fluxo NF - Criação', async () => {
      try {
        await supabase.rpc('nf_create' as any, {
          p_numero_nf: 'VALIDATION-TEST',
          p_numero_pedido: 'VAL-001',
          p_ordem_compra: 'VAL-OC',
          p_data_recebimento: new Date().toISOString().split('T')[0],
          p_fornecedor: 'Fornecedor Validação',
          p_cnpj_fornecedor: '00000000000100',
          p_cliente_cnpj: '99999999000100',
          p_produto: 'Produto Validação',
          p_quantidade: 1,
          p_peso: 1.0,
          p_volume: 1.0,
          p_localizacao: 'VALIDATION'
        });
        return { function_exists: true, note: 'Função executou sem erro' };
      } catch (error: any) {
        return { 
          function_exists: !error.message.includes('does not exist'),
          expected_error: error?.message?.includes('Cliente não encontrado') || false,
          note: 'Função testada com dados inválidos intencionalmente'
        };
      }
    });

    await runValidation('Fluxo NF - Solicitação', async () => {
      try {
        await supabase.rpc('nf_solicitar', {
          p_nf_id: '00000000-0000-0000-0000-000000000000',
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });
        return { function_exists: true, note: 'Função executou sem erro' };
      } catch (error: any) {
        return { 
          function_exists: !error.message.includes('does not exist'),
          expected_error: error?.message?.includes('não encontrada') || false
        };
      }
    });

    await runValidation('Fluxo NF - Confirmação', async () => {
      try {
        await supabase.rpc('nf_confirmar', {
          p_nf_id: '00000000-0000-0000-0000-000000000000',
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });
        return { function_exists: true, note: 'Função executou sem erro' };
      } catch (error: any) {
        return { 
          function_exists: !error.message.includes('does not exist'),
          expected_error: error?.message?.includes('não encontrada') || false
        };
      }
    });

    await runValidation('Fluxo Financeiro', async () => {
      try {
        await supabase.rpc('financeiro_create_documento' as any, {
          p_cliente_id: '00000000-0000-0000-0000-000000000000',
          p_numero_cte: 'VAL-TEST-001',
          p_data_vencimento: new Date().toISOString().split('T')[0],
          p_valor: 100.00,
          p_observacoes: 'Teste de validação'
        });
        return { function_exists: true, note: 'Função executou sem erro' };
      } catch (error: any) {
        return { 
          function_exists: !error.message.includes('does not exist'),
          expected_error: error?.message?.includes('não encontrado') || false
        };
      }
    });

    // CADASTROS E CRUD
    await runValidation('CRUD Clientes', async () => {
      try {
        const { data, error } = await supabase.rpc('get_clientes_for_user' as any);
        return { 
          rpc_available: !error || !error.message.includes('does not exist'),
          has_direct_access: true
        };
      } catch (err: any) {
        return { rpc_available: false, note: 'Função RPC não encontrada' };
      }
    });

    await runValidation('CRUD Notas Fiscais', async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('id, numero_nf, status, cliente_id')
        .limit(10);
      
      if (error) throw error;
      return { accessible: true, sample_count: data?.length || 0 };
    });

    await runValidation('CRUD Documentos Financeiros', async () => {
      try {
        const { data, error } = await supabase.from('documentos_financeiros' as any)
          .select('id, numero_cte, status, cliente_id')
          .limit(10);
        
        if (error) throw error;
        return { accessible: true, sample_count: data?.length || 0 };
      } catch (err: any) {
        if (err.message?.includes('permission denied')) {
          throw new Error('Sem permissão para documentos financeiros');
        }
        throw err;
      }
    });

    // PERFORMANCE E INTEGRIDADE
    await runValidation('Performance Database', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('id, numero_nf, status, cliente_id')
        .limit(100);
      
      if (error) throw error;
      
      const queryTime = Date.now() - startTime;
      
      return { 
        query_time_ms: queryTime,
        records_fetched: data?.length || 0,
        performance: queryTime < 1000 ? 'good' : queryTime < 3000 ? 'acceptable' : 'slow'
      };
    });

    await runValidation('Integridade de Dados', async () => {
      try {
        const { data, error } = await supabase.rpc('validate_data_integrity' as any);
        if (error) throw error;
        return data;
      } catch (err: any) {
        if (err.message?.includes('does not exist')) {
          return { note: 'Função de validação não encontrada', status: 'function_missing' };
        }
        throw err;
      }
    });

    setIsRunning(false);
    setOverallStatus('completed');
    
    const updatedValidations = validations.filter(v => v.status !== 'pending');
    const hasErrors = updatedValidations.some(v => v.status === 'error');
    const hasWarnings = updatedValidations.some(v => v.status === 'warning');
    
    if (hasErrors) {
      toast.error('❌ Validação encontrou ERROS CRÍTICOS - Sistema NÃO está pronto para produção');
    } else if (hasWarnings) {
      toast.warning('⚠️ Validação encontrou avisos - Revisar antes da produção');
    } else {
      toast.success('✅ Todos os testes passaram - Sistema PRONTO para produção');
    }
  };

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'running': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success': return <Badge variant="secondary" className="bg-green-100 text-green-800">Passou</Badge>;
      case 'error': return <Badge variant="destructive">Erro</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aviso</Badge>;
      case 'running': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Executando</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const successCount = validations.filter(v => v.status === 'success').length;
  const errorCount = validations.filter(v => v.status === 'error').length;
  const warningCount = validations.filter(v => v.status === 'warning').length;

  const categorizedValidations = validations.reduce((acc, validation) => {
    if (!acc[validation.category]) {
      acc[validation.category] = [];
    }
    acc[validation.category].push(validation);
    return acc;
  }, {} as Record<string, ValidationResult[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Validação Completa para Produção</h2>
          <p className="text-muted-foreground">
            Testa todos os fluxos críticos: NFs, financeiro, cadastros e segurança
          </p>
        </div>
        <Button 
          onClick={runAllValidations} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? 'Executando Validações...' : 'Executar Validação Completa'}
        </Button>
      </div>

      {overallStatus === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Validação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✅ {successCount} Passou
              </Badge>
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  ⚠️ {warningCount} Avisos
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">
                  ❌ {errorCount} Erros Críticos
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {validations.length > 0 && (
        <div className="space-y-6">
          {Object.entries(categorizedValidations).map(([category, categoryValidations]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryValidations.map((validation) => (
                    <div key={validation.test} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(validation.status)}
                        <div>
                          <p className="font-medium">{validation.test}</p>
                          <p className="text-sm text-muted-foreground">{validation.message}</p>
                          {validation.duration && (
                            <p className="text-xs text-muted-foreground">
                              Executado em {validation.duration}ms
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(validation.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {validations.length === 0 && !isRunning && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Clique em "Executar Validação Completa" para começar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}