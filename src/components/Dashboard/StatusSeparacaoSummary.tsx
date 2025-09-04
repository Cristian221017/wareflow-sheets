import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, Package, Truck, BarChart3 } from "lucide-react";
import { useNFs } from "@/hooks/useNFs";
import { useNFsCliente } from "@/hooks/useNFsCliente";
import { useAuth } from "@/contexts/AuthContext";
import type { NotaFiscal } from "@/types/nf";

// Configuração dos status de separação
const statusConfig = {
  pendente: {
    label: "Aguardando Separação",
    icon: Clock,
    color: "hsl(var(--muted-foreground))",
    description: "Mercadorias sendo preparadas para separação",
    progress: 25,
  },
  em_separacao: {
    label: "Em Separação",
    icon: Package,
    color: "hsl(213 94% 68%)",
    description: "Equipe separando os produtos",
    progress: 50,
  },
  separacao_concluida: {
    label: "Separação Concluída",
    icon: CheckCircle,
    color: "hsl(142 76% 36%)",
    description: "Produtos prontos para carregamento",
    progress: 75,
  },
  separacao_com_pendencia: {
    label: "Pendências na Separação",
    icon: AlertCircle,
    color: "hsl(0 84% 60%)",
    description: "Pendências que requerem atenção",
    progress: 60,
  },
  em_viagem: {
    label: "Em Viagem",
    icon: Truck,
    color: "hsl(262 83% 58%)",
    description: "Mercadoria em transporte",
    progress: 90,
  },
  entregue: {
    label: "Entregue",
    icon: CheckCircle,
    color: "hsl(142 76% 36%)",
    description: "Entrega concluída com sucesso",
    progress: 100,
  },
};

interface StatusSeparacaoSummaryProps {
  title?: string;
  showOnlyArmazenadas?: boolean;
}

export function StatusSeparacaoSummary({ 
  title = "Resumo dos Status de Separação",
  showOnlyArmazenadas = false 
}: StatusSeparacaoSummaryProps) {
  const { user } = useAuth();
  const isCliente = user?.type === "cliente";
  
  // Se for para mostrar apenas armazenadas, buscar apenas ARMAZENADA
  // Senão, buscar todos os status
  const { data: nfsArmazenadas } = isCliente ? useNFsCliente("ARMAZENADA") : useNFs("ARMAZENADA");
  const { data: nfsSolicitadas } = isCliente ? useNFsCliente("SOLICITADA") : useNFs("SOLICITADA");
  const { data: nfsConfirmadas } = isCliente ? useNFsCliente("CONFIRMADA") : useNFs("CONFIRMADA");

  // Combinar todas as NFs ou apenas armazenadas
  const allNfs: NotaFiscal[] = showOnlyArmazenadas 
    ? (Array.isArray(nfsArmazenadas) ? nfsArmazenadas.filter(nf => 
        nf.status_separacao !== 'em_viagem' && nf.status_separacao !== 'entregue'
      ) : [])
    : [
        ...(Array.isArray(nfsArmazenadas) ? nfsArmazenadas : []), 
        ...(Array.isArray(nfsSolicitadas) ? nfsSolicitadas : []), 
        ...(Array.isArray(nfsConfirmadas) ? nfsConfirmadas : [])
      ];

  // Agrupar por status de separação
  const statusGroups = allNfs.reduce((acc, nf) => {
    const status = nf.status_separacao || "pendente";
    if (!acc[status]) acc[status] = [];
    acc[status].push(nf);
    return acc;
  }, {} as Record<string, NotaFiscal[]>);

  const totalNfs = allNfs.length;

  if (totalNfs === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-medium">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma mercadoria encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-medium">{title}</h3>
          </div>
          <Badge variant="secondary">{totalNfs}</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(statusConfig)
            .filter(([status]) => {
              // Se mostrar apenas armazenadas, filtrar status de viagem/entregue
              if (showOnlyArmazenadas) {
                return !['em_viagem', 'entregue'].includes(status);
              }
              return true;
            })
            .map(([status, config]) => {
              const count = statusGroups[status]?.length || 0;
              const percentage = totalNfs > 0 ? (count / totalNfs) * 100 : 0;
              
              return (
                <div key={status} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" style={{ color: config.color }} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <div className="mb-2">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}