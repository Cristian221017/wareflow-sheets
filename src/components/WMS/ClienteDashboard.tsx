import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { Package, FileText, Truck, BarChart3 } from 'lucide-react';

export function ClienteDashboard() {
  const { notasFiscais, pedidosLiberacao, pedidosLiberados } = useWMS();
  const { user } = useAuth();

  // Filter data for current client
  const clienteNFs = notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj);
  const clientePedidos = pedidosLiberacao.filter(p => p.cnpjCliente === user?.cnpj);
  const clienteLiberados = pedidosLiberados.filter(p => {
    const pedido = pedidosLiberacao.find(pl => pl.numeroPedido === p.numeroPedido);
    return pedido?.cnpjCliente === user?.cnpj;
  });

  // Calculate statistics
  const totalPeso = clienteNFs.reduce((sum, nf) => sum + nf.peso, 0);
  const totalVolume = clienteNFs.reduce((sum, nf) => sum + nf.volume, 0);
  const nfsArmazenadas = clienteNFs.filter(nf => nf.status === 'Armazenada').length;
  const pedidosAnalise = clientePedidos.filter(p => p.status === 'Em análise').length;

  const getStatusCount = (status: string) => {
    return clienteNFs.filter(nf => nf.status === status).length;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Mercadorias
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clienteNFs.length}</div>
            <p className="text-xs text-muted-foreground">
              {nfsArmazenadas} disponíveis para liberação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Peso Total
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPeso.toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground">
              Volume: {totalVolume.toFixed(2)} m³
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Pendentes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidosAnalise}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando análise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solicitação Confirmada
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clienteLiberados.length}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para retirada
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status das Mercadorias</CardTitle>
            <CardDescription>
              Distribuição das suas mercadorias por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-sm">Armazenadas</span>
                </div>
                <span className="text-sm font-medium">{getStatusCount('ARMAZENADA')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span className="text-sm">Ordem Solicitada</span>
                </div>
                <span className="text-sm font-medium">{getStatusCount('SOLICITADA')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm">Solicitação Confirmada</span>
                </div>
                <span className="text-sm font-medium">{getStatusCount('CONFIRMADA')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Atividades</CardTitle>
            <CardDescription>
              Movimentações recentes das suas mercadorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clienteNFs.slice(0, 5).map((nf) => (
                <div key={nf.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{nf.numeroNF}</p>
                    <p className="text-xs text-muted-foreground">{nf.produto}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{nf.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}