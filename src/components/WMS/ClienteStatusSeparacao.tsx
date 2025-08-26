import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useNFs } from '@/hooks/useNFs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  pendente: {
    label: 'Aguardando Separação',
    icon: Clock,
    variant: 'secondary' as const,
    description: 'Sua mercadoria está sendo preparada para separação',
    progress: 25,
    color: 'text-muted-foreground'
  },
  em_separacao: {
    label: 'Em Separação',
    icon: Package,
    variant: 'default' as const,
    description: 'Nossa equipe está separando seus produtos',
    progress: 50,
    color: 'text-blue-600'
  },
  separacao_concluida: {
    label: 'Separação Concluída',
    icon: CheckCircle,
    variant: 'default' as const,
    description: 'Produtos separados e prontos para carregamento',
    progress: 100,
    color: 'text-green-600'
  },
  separacao_com_pendencia: {
    label: 'Pendências na Separação',
    icon: AlertTriangle,
    variant: 'destructive' as const,
    description: 'Encontramos algumas pendências que requerem atenção',
    progress: 75,
    color: 'text-red-600'
  }
};

export function ClienteStatusSeparacao() {
  const { data: notasFiscais, isLoading } = useNFs("ARMAZENADA");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Carregando informações de separação...</p>
        </CardContent>
      </Card>
    );
  }

  const nfsArmazenadas = notasFiscais || [];

  if (nfsArmazenadas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Status de Separação
          </CardTitle>
          <CardDescription>
            Acompanhe o progresso da separação das suas mercadorias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Não há mercadorias em separação no momento</p>
            <p className="text-sm mt-1">Quando você tiver produtos armazenados, o status aparecerá aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por status de separação
  const statusCounts = nfsArmazenadas.reduce((acc, nf) => {
    const status = nf.status_separacao || 'pendente';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Resumo geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Resumo da Separação
          </CardTitle>
          <CardDescription>
            Status geral das suas {nfsArmazenadas.length} notas fiscais armazenadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = statusCounts[key] || 0;
              const Icon = config.icon;
              
              return (
                <div key={key} className="flex items-center space-x-3 p-3 rounded-lg border">
                  <div className={cn("flex-shrink-0", config.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes por Nota Fiscal</CardTitle>
          <CardDescription>
            Status individual de cada NF no processo de separação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nfsArmazenadas.map((nf) => {
              const statusSeparacao = nf.status_separacao || 'pendente';
              const config = statusConfig[statusSeparacao];
              const Icon = config.icon;
              
              return (
                <div key={nf.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("flex-shrink-0", config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">NF {nf.numero_nf}</h4>
                        <p className="text-sm text-muted-foreground">
                          {nf.produto} • Qtd: {nf.quantidade} • {Number(nf.peso).toFixed(1)}kg
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          {config.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Recebida em {format(new Date(nf.data_recebimento), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <Progress value={config.progress} className="h-2" />
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}