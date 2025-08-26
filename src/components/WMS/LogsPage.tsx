import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Filter, RefreshCw, Search, TestTube } from 'lucide-react';
import { useSystemLogs, type LogFilters } from '@/hooks/useSystemLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { log } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export function LogsPage() {
  const queryClient = useQueryClient();
  const once = useRef(false);

  const [filters, setFilters] = useState<LogFilters>({
    level: ['ERROR', 'WARN', 'INFO'],
    entityType: [],
    action: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useSystemLogs(filters);

  // Função de teste para gerar logs
  const handleTestLog = async () => {
    console.log('🔎 Log de teste gerado!', { 
      source: 'LogsPage', 
      timestamp: new Date().toISOString() 
    });
    
    // Tentar disparar um evento que possa gerar logs do sistema
    try {
      // Simular uma operação que gere log via funções existentes
      await supabase.auth.getUser(); 
      console.log('Operação de teste executada - verifique se gerou logs');
      refetch();
    } catch (e) {
      console.error('Teste falhou:', e);
    }
  };

  // Configurar realtime para logs com guard
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    log('🔄 Configurando realtime para logs');
  }, []);

  const applyFilters = () => {
    const newFilters: LogFilters = {
      level: selectedLevel ? [selectedLevel as any] : ['ERROR', 'WARN', 'INFO'],
      entityType: selectedEntityType ? [selectedEntityType] : [],
      action: selectedAction ? [selectedAction] : [],
      q: searchTerm || undefined
    };
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEntityType('');
    setSelectedAction('');
    setSelectedLevel('');
    setFilters({
      level: ['ERROR', 'WARN', 'INFO'],
      entityType: [],
      action: []
    });
  };

  // Atalhos para filtros comuns
  const quickFilters = [
    { label: 'Financeiro', entityType: 'FINANCEIRO', action: '' },
    { label: 'NF', entityType: 'NF', action: '' },
    { label: 'Erros', entityType: '', action: '', level: 'ERROR' },
    { label: 'Uploads', entityType: 'FINANCEIRO', action: 'DOC_PATH_SET' },
  ];

  const applyQuickFilter = (quickFilter: any) => {
    setSelectedEntityType(quickFilter.entityType || '');
    setSelectedAction(quickFilter.action || '');
    setSelectedLevel(quickFilter.level || '');
    setSearchTerm('');
    
    const newFilters: LogFilters = {
      level: quickFilter.level ? [quickFilter.level] : ['ERROR', 'WARN', 'INFO'],
      entityType: quickFilter.entityType ? [quickFilter.entityType] : [],
      action: quickFilter.action ? [quickFilter.action] : []
    };
    setFilters(newFilters);
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'ERROR': return 'destructive';
      case 'WARN': return 'secondary';
      case 'INFO': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Event Logs
          </CardTitle>
          <CardDescription>
            Monitore todos os eventos do sistema em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            {/* Atalhos rápidos */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Filtros rápidos:</span>
              {quickFilters.map((filter, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter(filter)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Filtros detalhados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Número NF, CTE, ação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="entityType">Tipo de Entidade</Label>
                <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                    <SelectItem value="NF">Notas Fiscais</SelectItem>
                    <SelectItem value="CLIENTE">Clientes</SelectItem>
                    <SelectItem value="AUTH">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="action">Ação</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="DOC_CREATED">Documento Criado</SelectItem>
                    <SelectItem value="DOC_UPDATED">Documento Atualizado</SelectItem>
                    <SelectItem value="DOC_PATH_SET">Arquivo Anexado</SelectItem>
                    <SelectItem value="NF_CREATED">NF Criada</SelectItem>
                    <SelectItem value="NF_SOLICITADA">NF Solicitada</SelectItem>
                    <SelectItem value="NF_CONFIRMADA">NF Confirmada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="level">Nível</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARN">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="gap-2">
                <Search className="w-4 h-4" />
                Filtrar
              </Button>
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <Filter className="w-4 h-4" />
                Limpar
              </Button>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <Button variant="secondary" onClick={handleTestLog} className="gap-2">
                <TestTube className="w-4 h-4" />
                Gerar Log Teste
              </Button>
            </div>
          </div>

          {/* Lista de logs */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Carregando logs...</p>
              </div>
            ) : data?.pages[0]?.rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum log encontrado com os filtros aplicados</p>
              </div>
            ) : (
              <>
                {data?.pages.map((page, pageIndex) =>
                  page.rows.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getBadgeVariant(log.status)}>
                              {log.status}
                            </Badge>
                            <Badge variant="outline">
                              {log.entity_type}
                            </Badge>
                            <Badge variant="outline">
                              {log.action}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium">
                            {log.message || 'Sem mensagem'}
                          </p>
                          
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <details className="text-xs text-muted-foreground">
                              <summary className="cursor-pointer">Ver detalhes</summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        
                        <div className="text-right text-xs text-muted-foreground ml-4">
                          {log.actor_role && (
                            <p>Por: {log.actor_role}</p>
                          )}
                          {log.correlation_id && (
                            <p className="font-mono">ID: {log.correlation_id.slice(0, 8)}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
                
                {hasNextPage && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}