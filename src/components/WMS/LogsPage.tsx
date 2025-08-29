import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Filter, RefreshCw, Search, TestTube, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useSystemLogs, type LogFilters } from '@/hooks/useSystemLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { log, error as logError } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function PrettyJson({ data }: { data: any }) {
  const [open, setOpen] = useState(false);
  
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return null;
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success("Meta copiada para clipboard");
    } catch (err) {
      toast.error("Erro ao copiar meta");
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(!open)}
          className="h-6 px-2 text-xs"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {open ? "Esconder meta" : "Ver meta"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyToClipboard}
          className="h-6 px-2 text-xs"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copiar JSON
        </Button>
      </div>
      
      {open && (
        <div className="border rounded-md bg-muted/50">
          <pre className="p-3 text-xs overflow-auto max-h-60 font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function LogsPage() {
  const queryClient = useQueryClient();
  const once = useRef(false);

  const [filters, setFilters] = useState<LogFilters>({
    level: ['ERROR', 'WARN', 'INFO'],
    entityType: [],
    action: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useSystemLogs(filters);

  // Função de teste para gerar logs (usa RPC real)
  const handleTestLog = async () => {
    try {
      const { error } = await (supabase.rpc as any)("log_system_event", {
        p_entity_type: "TEST",
        p_action: "BUTTON_CLICK",
        p_status: "INFO",
        p_message: "🔎 Teste de log gerado via botão da UI",
        p_meta: { source: "LogsPage", timestamp: new Date().toISOString() }
      });

      if (error) {
        logError("Erro ao gerar log de teste:", error);
      } else {
        log("Log de teste gerado com sucesso!");
        refetch(); // recarrega tabela de logs
      }
    } catch (e) {
      logError("Erro ao gerar log:", e);
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
      level: selectedLevel && selectedLevel !== 'all' ? [selectedLevel as any] : ['ERROR', 'WARN', 'INFO'],
      entityType: selectedEntityType && selectedEntityType !== 'all' ? [selectedEntityType] : [],
      action: selectedAction && selectedAction !== 'all' ? [selectedAction] : [],
      q: searchTerm || undefined
    };
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEntityType('all');
    setSelectedAction('all');
    setSelectedLevel('all');
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
    setSelectedEntityType(quickFilter.entityType || 'all');
    setSelectedAction(quickFilter.action || 'all');
    setSelectedLevel(quickFilter.level || 'all');
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
                  key={`${filter.label}-${index}`}
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
                    <SelectItem value="all">Todos</SelectItem>
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
                    <SelectItem value="all">Todas</SelectItem>
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
                    <SelectItem value="all">Todos</SelectItem>
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
                🔎 Gerar Log Teste
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
                          
                          <PrettyJson data={log.meta} />
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