import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSystemLogs, LogFilters, LogLevel } from "@/hooks/useSystemLogs";
import { subscribeSystemLogs } from "@/lib/realtimeSystemLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Filter, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

const ENTITY_TYPES = [
  "NF", "FINANCEIRO", "AUTH", "INTEGRACAO", "UI", "SISTEMA"
];

const LOG_LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR"];

export default function LogsPage() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<(() => void) | null>(null);
  
  const [filters, setFilters] = useState<LogFilters>({ 
    level: ["ERROR", "WARN", "INFO"] 
  });
  
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    refetch,
    isLoading 
  } = useSystemLogs(filters);

  // Configurar realtime
  useEffect(() => {
    if (subscriptionRef.current) return;
    
    subscriptionRef.current = subscribeSystemLogs(queryClient);
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [queryClient]);

  const logs = data?.pages.flatMap(page => page.rows) ?? [];
  const totalLogs = data?.pages[0]?.total ?? 0;

  const getBadgeVariant = (level: LogLevel) => {
    switch (level) {
      case "ERROR": return "destructive";
      case "WARN": return "secondary";
      default: return "outline";
    }
  };

  const copyCorrelationId = async (correlationId: string) => {
    try {
      await navigator.clipboard.writeText(correlationId);
      toast.success("Correlation ID copiado!");
    } catch (error) {
      toast.error("Erro ao copiar Correlation ID");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Visualize e monitore eventos do sistema em tempo real
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mensagem ou meta..."
                  className="pl-10"
                  onChange={(e) => 
                    setFilters(prev => ({ ...prev, q: e.target.value || undefined }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nível</label>
              <Select
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    level: value === "all" ? undefined : [value as LogLevel]
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {LOG_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entidade</label>
              <Select
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    entityType: value === "all" ? undefined : [value]
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data/Hora</label>
              <Input
                type="datetime-local"
                onChange={(e) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    from: e.target.value || undefined 
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Eventos ({totalLogs} total)</span>
            {isLoading && (
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Data/Hora</th>
                  <th className="text-center p-3 font-medium">Nível</th>
                  <th className="text-left p-3 font-medium">Ação</th>
                  <th className="text-left p-3 font-medium">Entidade</th>
                  <th className="text-left p-3 font-medium">Mensagem</th>
                  <th className="text-center p-3 font-medium">Correlation ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr 
                    key={log.id} 
                    className={`border-b hover:bg-muted/25 ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    }`}
                  >
                    <td className="p-3 font-mono text-xs">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={getBadgeVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">
                      {log.action}
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="font-medium">{log.entity_type}</div>
                        {log.entity_id && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {log.entity_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 max-w-md">
                      <div className="truncate" title={log.message || ""}>
                        {log.message || "—"}
                      </div>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Meta: {JSON.stringify(log.meta).slice(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCorrelationId(log.correlation_id)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado com os filtros aplicados</p>
            </div>
          )}

          {hasNextPage && (
            <div className="p-4 flex justify-center border-t">
              <Button 
                onClick={() => fetchNextPage()} 
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}