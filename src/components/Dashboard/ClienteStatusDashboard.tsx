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

// Configuração dos status para o cliente
const statusClienteConfig = {
  armazenadas: {
    label: "Armazenadas",
    icon: Package,
    color: "hsl(214 100% 59%)",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    description: "Mercadorias disponíveis no armazém",
    status: "ARMAZENADA",
  },
  solicitadas: {
    label: "Solicitadas",
    icon: FileText,
    color: "hsl(38 92% 50%)",
    bgColor: "bg-orange-50", 
    textColor: "text-orange-700",
    description: "Aguardando aprovação da transportadora",
    status: "SOLICITADA",
  },
  confirmadas: {
    label: "Confirmadas",
    icon: CheckCircle,
    color: "hsl(142 76% 36%)",
    bgColor: "bg-green-50",
    textColor: "text-green-700", 
    description: "Prontas para retirada",
    status: "CONFIRMADA",
  },
  em_viagem: {
    label: "Em Viagem",
    icon: Truck,
    color: "hsl(262 83% 58%)",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    description: "Mercadorias em transporte",
    status: "CONFIRMADA",
    extraFilter: (nf: NotaFiscal) => !!nf.data_embarque && !nf.data_entrega,
  },
  entregues: {
    label: "Entregues",
    icon: PackageCheck,
    color: "hsl(142 76% 36%)",
    bgColor: "bg-emerald-50", 
    textColor: "text-emerald-700",
    description: "Entregas concluídas com sucesso",
    status: "ALL",
    extraFilter: (nf: NotaFiscal) => !!nf.data_entrega || nf.status_separacao === 'entregue',
  },
};

// Configuração do status de separação para detalhamento
const statusSeparacaoConfig = {
  pendente: {
    label: "Aguardando Separação",
    icon: Clock,
    color: "hsl(var(--muted-foreground))",
    progress: 25,
  },
  em_separacao: {
    label: "Em Separação", 
    icon: Package,
    color: "hsl(213 94% 68%)",
    progress: 50,
  },
  separacao_concluida: {
    label: "Separação Concluída",
    icon: CheckCircle,
    color: "hsl(142 76% 36%)",
    progress: 75,
  },
  separacao_com_pendencia: {
    label: "Pendências na Separação",
    icon: AlertCircle,
    color: "hsl(0 84% 60%)",
    progress: 60,
  },
};

export function ClienteStatusDashboard() {
  const queryClient = useQueryClient();
  
  // Buscar todas as NFs do cliente
  const { data: todasNfs, isLoading } = useNFsCliente();
  const { data: nfsArmazenadas } = useNFsCliente("ARMAZENADA");
  const { data: nfsSolicitadas } = useNFsCliente("SOLICITADA");  
  const { data: nfsConfirmadas } = useNFsCliente("CONFIRMADA");

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!todasNfs || !Array.isArray(todasNfs)) {
      return null;
    }

    const armazenadas = todasNfs.filter(nf => nf.status === 'ARMAZENADA');
    const solicitadas = todasNfs.filter(nf => nf.status === 'SOLICITADA');
    const confirmadas = todasNfs.filter(nf => nf.status === 'CONFIRMADA');
    const emViagem = todasNfs.filter(nf => 
      nf.status === 'CONFIRMADA' && nf.data_embarque && !nf.data_entrega
    );
    const entregues = todasNfs.filter(nf => 
      nf.data_entrega || nf.status_separacao === 'entregue'
    );

    const total = todasNfs.length;

    return {
      armazenadas: { count: armazenadas.length, items: armazenadas },
      solicitadas: { count: solicitadas.length, items: solicitadas },
      confirmadas: { count: confirmadas.length, items: confirmadas },
      em_viagem: { count: emViagem.length, items: emViagem },
      entregues: { count: entregues.length, items: entregues },
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
              {[1, 2, 3, 4, 5].map((i) => (
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
      {/* Header com título e refresh */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Status das Suas Mercadorias</h3>
            </div>
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
          
          {/* Grid de status principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(statusClienteConfig).map(([key, config]) => {
              const statData = stats[key as keyof typeof stats];
              const count = typeof statData === 'object' ? statData.count : 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              
              return (
                <div key={key} className={`p-4 rounded-lg border ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <config.icon className="w-5 h-5" style={{ color: config.color }} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white/60">
                      {count}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                      <span className={config.textColor}>{count}/{stats.total}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status de Separação detalhado (apenas para armazenadas) */}
      {stats.armazenadas.count > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Detalhamento das Mercadorias Armazenadas
              </h4>
              <Badge variant="outline">{stats.armazenadas.count} itens</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(statusSeparacaoConfig).map(([status, config]) => {
                const nfsWithStatus = stats.armazenadas.items.filter(
                  nf => (nf.status_separacao || 'pendente') === status
                );
                const count = nfsWithStatus.length;
                const percentage = stats.armazenadas.count > 0 ? (count / stats.armazenadas.count) * 100 : 0;
                
                return (
                  <div key={status} className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <config.icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="text-xs font-medium">{config.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {count}
                      </Badge>
                    </div>
                    <Progress value={config.progress} className="h-1.5 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(0)}% das armazenadas
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}