import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  FileText, 
  CheckCircle, 
  Clock, 
  Truck, 
  PackageCheck,
  BarChart3,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNFsCliente } from "@/hooks/useNFsCliente";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { NotaFiscal } from "@/types/nf";
import { log } from "@/utils/logger";
import { toast } from "sonner";

// Configuração completa do fluxo (igual ao transportador)
const statusFluxoCompleto = {
  pendente: {
    label: "Aguardando Separação",
    icon: Clock,
    color: "hsl(var(--muted-foreground))",
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    description: "Aguardando início da separação",
    progress: 15,
    step: 1,
  },
  em_separacao: {
    label: "Em Separação",
    icon: Package,
    color: "hsl(214 100% 59%)",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    description: "Mercadoria sendo separada",
    progress: 40,
    step: 2,
  },
  separacao_concluida: {
    label: "Separação Concluída",
    icon: CheckCircle,
    color: "hsl(142 76% 36%)",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    description: "Separação finalizada com sucesso",
    progress: 65,
    step: 3,
  },
  separacao_com_pendencia: {
    label: "Separação com Pendência",
    icon: AlertCircle,
    color: "hsl(0 84% 60%)",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    description: "Separação com problemas ou itens faltantes",
    progress: 50,
    step: 2.5,
  },
  em_viagem: {
    label: "Em Viagem",
    icon: Truck,
    color: "hsl(262 83% 58%)",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    description: "Mercadoria despachada e em transporte",
    progress: 85,
    step: 4,
  },
  entregue: {
    label: "Entregue",
    icon: PackageCheck,
    color: "hsl(142 76% 36%)",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    description: "Mercadoria entregue ao destinatário",
    progress: 100,
    step: 5,
  },
};

interface StatusCount {
  count: number;
  items: NotaFiscal[];
}

interface DashboardStats {
  armazenadas: StatusCount;
  solicitadas: StatusCount;
  confirmadas: StatusCount;
  statusSeparacao: Record<string, StatusCount>;
  total: number;
}

export function ClienteStatusDashboard() {
  const queryClient = useQueryClient();
  
  // Buscar todas as NFs do cliente
  const { data: todasNfs, isLoading } = useNFsCliente();

  // Calcular estatísticas baseadas no fluxo completo
  const stats: DashboardStats | null = useMemo(() => {
    if (!todasNfs || !Array.isArray(todasNfs)) {
      return null;
    }

    log('📊 Calculando dashboard completo baseado em NFs reais:', todasNfs);

    // Status principais
    const armazenadas = todasNfs.filter(nf => nf.status === 'ARMAZENADA');
    const solicitadas = todasNfs.filter(nf => nf.status === 'SOLICITADA');
    const confirmadas = todasNfs.filter(nf => nf.status === 'CONFIRMADA');

    // Status de separação detalhados (para todas as NFs)
    const statusSeparacao: Record<string, StatusCount> = {};
    
    Object.keys(statusFluxoCompleto).forEach(status => {
      const nfsComStatus = todasNfs.filter(nf => {
        const statusSeparacaoAtual = nf.status_separacao || 'pendente';
        
        // Mapear status especiais baseados em status_separacao como prioridade
        if (status === 'em_viagem') {
          return nf.status_separacao === 'em_viagem' || (nf.data_embarque && !nf.data_entrega);
        }
        if (status === 'entregue') {
          return nf.status_separacao === 'entregue' || nf.data_entrega;
        }
        
        return statusSeparacaoAtual === status;
      });
      
      statusSeparacao[status] = { count: nfsComStatus.length, items: nfsComStatus };
    });

    const total = todasNfs.length;

    return {
      armazenadas: { count: armazenadas.length, items: armazenadas },
      solicitadas: { count: solicitadas.length, items: solicitadas },
      confirmadas: { count: confirmadas.length, items: confirmadas },
      statusSeparacao,
      total
    };
  }, [todasNfs]);

  const handleRefresh = async () => {
    log('🔄 CLIENTE DASHBOARD: Sincronizando dados...');
    
    // Invalidar e refetch todas as queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['nfs-cliente'] });
    queryClient.invalidateQueries({ queryKey: ['nfs'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    
    await queryClient.refetchQueries({ 
      predicate: (query) => {
        const [firstKey] = query.queryKey || [];
        return firstKey === 'nfs-cliente' || firstKey === 'nfs' || firstKey === 'dashboard';
      }
    });
    
    toast.success("Dashboard atualizado!");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-2 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-medium">Status das Suas Mercadorias</h3>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma mercadoria encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fluxo Completo de Status de Separação (Igual ao Transportador) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Acompanhamento das Suas Mercadorias
            </h3>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                Total: {stats.total} mercadorias
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(statusFluxoCompleto).map(([status, config]) => {
              const statusData = stats.statusSeparacao[status];
              const count = statusData?.count || 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              
              return (
                <div key={status} className={`p-5 rounded-lg border-2 transition-all ${count > 0 ? 'border-primary/20 shadow-md' : 'border-muted'} ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/60 shadow-sm">
                        <config.icon className="w-5 h-5" style={{ color: config.color }} />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">{config.label}</span>
                        <div className="text-xs text-muted-foreground">Etapa {config.step}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white/80 font-bold text-sm">
                      {count}
                    </Badge>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Progresso da Etapa</span>
                      <span className={config.textColor}>{config.progress}%</span>
                    </div>
                    <Progress value={config.progress} className="h-2.5" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{percentage.toFixed(1)}% do total</span>
                      <span className={config.textColor}>{count}/{stats.total}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
                  </div>
                  
                  {/* Barra de representação visual */}
                  <div className="mt-3">
                    <div className="w-full bg-white/50 rounded-full h-1.5">
                      <div 
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.max(percentage, 2)}%`, // Mínimo 2% para visibilidade
                          backgroundColor: config.color 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Fluxo sequencial */}
          <div className="mt-8 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">Fluxo do Processo</span>
            </div>
            
            <div className="flex items-center justify-between space-x-2 overflow-x-auto">
              {Object.entries(statusFluxoCompleto)
                .sort((a, b) => a[1].step - b[1].step)
                .map(([status, config], index, array) => {
                  const count = stats.statusSeparacao[status]?.count || 0;
                  const isActive = count > 0;
                  
                  return (
                    <div key={status} className="flex items-center">
                      <div className={`flex flex-col items-center min-w-[120px] p-3 rounded-lg transition-all ${isActive ? config.bgColor + ' border-2 border-primary/20' : 'bg-muted/20'}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 ${isActive ? 'bg-white shadow-sm' : 'bg-muted'}`}>
                          <config.icon 
                            className="w-4 h-4" 
                            style={{ color: isActive ? config.color : 'hsl(var(--muted-foreground))' }} 
                          />
                        </div>
                        <span className={`text-xs font-medium text-center leading-tight ${isActive ? config.textColor : 'text-muted-foreground'}`}>
                          {config.label}
                        </span>
                        <Badge variant={isActive ? "default" : "secondary"} className="mt-1 text-xs">
                          {count}
                        </Badge>
                      </div>
                      
                      {/* Seta conectora */}
                      {index < array.length - 1 && (
                        <div className="flex items-center px-2">
                          <div className="w-6 h-0.5 bg-muted-foreground/30 rounded"></div>
                          <div className="w-0 h-0 border-l-[6px] border-l-muted-foreground/30 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-1"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Textual */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4" />
            <h4 className="font-medium">Resumo do Status das Suas Mercadorias</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p>
                📦 <strong>{stats.armazenadas.count}</strong> mercadorias armazenadas no depósito
              </p>
              <p>
                📝 <strong>{stats.solicitadas.count}</strong> solicitações de carregamento pendentes
              </p>
              <p>
                ✅ <strong>{stats.confirmadas.count}</strong> mercadorias confirmadas para retirada
              </p>
            </div>
            <div className="space-y-2">
              <p>
                🚚 <strong>{stats.statusSeparacao.em_viagem?.count || 0}</strong> mercadorias em viagem
              </p>
              <p>
                🎯 <strong>{stats.statusSeparacao.entregue?.count || 0}</strong> entregas concluídas
              </p>
              <p className="text-muted-foreground">
                Total: <strong>{stats.total}</strong> mercadorias no sistema
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}