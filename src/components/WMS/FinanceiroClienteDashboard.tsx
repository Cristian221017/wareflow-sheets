import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { DocumentoFinanceiro } from '@/types/financeiro';

interface FinanceiroClienteDashboardProps {
  className?: string;
}

export function FinanceiroClienteDashboard({ className }: FinanceiroClienteDashboardProps) {
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
      };
    }

    const hoje = new Date();
    
    return documentos.reduce((acc, doc) => {
      const isVencido = !doc.pagoEm && new Date(doc.dataVencimento) < hoje;
      const isPago = !!doc.pagoEm;
      const valor = doc.valor || 0;
      const valorPago = doc.valorPago || 0;

      return {
        total: acc.total + 1,
        emAberto: acc.emAberto + (!isPago && !isVencido ? 1 : 0),
        vencidos: acc.vencidos + (isVencido ? 1 : 0),
        pagos: acc.pagos + (isPago ? 1 : 0),
        valorTotal: acc.valorTotal + valor,
        valorVencido: acc.valorVencido + (isVencido ? valor : 0),
        valorPago: acc.valorPago + valorPago,
      };
    }, {
      total: 0,
      emAberto: 0,
      vencidos: 0,
      pagos: 0,
      valorTotal: 0,
      valorVencido: 0,
      valorPago: 0,
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
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">documentos</p>
          </CardContent>
        </Card>

        {/* Em Aberto */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.emAberto}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Vencidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Pagos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pagos}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo com indicadores */}
      {stats.vencidos > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Atenção: {stats.vencidos} documento{stats.vencidos > 1 ? 's' : ''} vencido{stats.vencidos > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600">
                  Total vencido: R$ {stats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}