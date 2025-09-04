import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { DocumentoFinanceiro } from '@/types/financeiro';

interface FinanceiroTransportadoraDashboardProps {
  className?: string;
}

export function FinanceiroTransportadoraDashboard({ className }: FinanceiroTransportadoraDashboardProps) {
  const { documentos, loading } = useFinanceiro();

  const stats = useMemo(() => {
    if (!documentos.length) {
      return {
        total: 0,
        emAberto: 0,
        vencidos: 0,
        pagos: 0,
        valorTotal: 0,
        valorVencido: 0,
        valorPago: 0,
        valorEmAberto: 0,
      };
    }

    // Função helper para verificar se documento está vencido
    const isVencido = (dataVencimento: string, status: string): boolean => {
      // Só verifica vencimento por data para documentos 'Em aberto'
      if (!dataVencimento || status !== 'Em aberto') return false;
      
      const date = new Date(dataVencimento + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    };
    
    return documentos.reduce((acc, doc) => {
      const docVencido = doc.status === 'Vencido' || isVencido(doc.dataVencimento, doc.status);
      const docEmAberto = doc.status === 'Em aberto' && !isVencido(doc.dataVencimento, doc.status);
      const docPago = doc.status === 'Pago';
      const valor = doc.valor || 0;
      const valorPago = doc.valorPago || (docPago ? valor : 0);

      return {
        total: acc.total + 1,
        emAberto: acc.emAberto + (docEmAberto ? 1 : 0),
        vencidos: acc.vencidos + (docVencido ? 1 : 0),
        pagos: acc.pagos + (docPago ? 1 : 0),
        valorTotal: acc.valorTotal + valor,
        valorVencido: acc.valorVencido + (docVencido ? valor : 0),
        valorPago: acc.valorPago + valorPago,
        valorEmAberto: acc.valorEmAberto + (docEmAberto ? valor : 0),
      };
    }, {
      total: 0,
      emAberto: 0,
      vencidos: 0,
      pagos: 0,
      valorTotal: 0,
      valorVencido: 0,
      valorPago: 0,
      valorEmAberto: 0,
    });
  }, [documentos]);

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando dashboard financeiro...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total de Documentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CTEs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Em Aberto */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.emAberto}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Vencidos - CRÍTICO */}
        <Card className={stats.vencidos > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.vencidos > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.vencidos > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {stats.vencidos}
            </div>
            <p className={`text-xs ${stats.vencidos > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              R$ {stats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Recebidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebidos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pagos}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {stats.vencidos > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Atenção: {stats.vencidos} CTE{stats.vencidos > 1 ? 's' : ''} vencido{stats.vencidos > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600">
                  Valor vencido: R$ {stats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Inadimplência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.total > 0 ? ((stats.vencidos / stats.total) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.vencidos} de {stats.total} documentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.total > 0 ? ((stats.pagos / stats.total) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.pagos} de {stats.total} documentos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}