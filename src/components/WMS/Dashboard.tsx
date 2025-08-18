import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Package, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { useWMS } from '@/contexts/WMSContext';
import { useMemo } from 'react';

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--error))'];

export function Dashboard() {
  const { notasFiscais, pedidosLiberacao, pedidosLiberados } = useWMS();

  const dashboardData = useMemo(() => {
    // Status distribution
    const statusData = [
      { 
        name: 'Em separação', 
        value: notasFiscais.filter(nf => nf.status === 'Em separação').length,
        color: COLORS[0]
      },
      { 
        name: 'Liberada para carregar',
        value: notasFiscais.filter(nf => nf.status === 'Liberada para carregar').length,
        color: COLORS[1]
      },
      { 
        name: 'Carregamento solicitado',
        value: notasFiscais.filter(nf => nf.status === 'Carregamento solicitado').length,
        color: COLORS[2]
      }
    ];

    // Client volume data
    const clientVolumeData = pedidosLiberados.reduce((acc, pedido) => {
      const existing = acc.find(item => item.cliente === pedido.cliente);
      if (existing) {
        existing.peso += pedido.peso;
        existing.volume += pedido.volume;
      } else {
        acc.push({
          cliente: pedido.cliente,
          peso: pedido.peso,
          volume: pedido.volume
        });
      }
      return acc;
    }, [] as Array<{ cliente: string; peso: number; volume: number }>);

    // Timeline data (weekly)
    const timelineData = pedidosLiberados.reduce((acc, pedido) => {
      const week = new Date(pedido.dataLiberacao).toISOString().slice(0, 10);
      const existing = acc.find(item => item.semana === week);
      if (existing) {
        existing.pedidos += 1;
      } else {
        acc.push({ semana: week, pedidos: 1 });
      }
      return acc;
    }, [] as Array<{ semana: string; pedidos: number }>);

    // SLA calculation
    const slaTotal = pedidosLiberados.reduce((total, pedido) => {
      const solicitacao = new Date(pedido.createdAt);
      const liberacao = new Date(pedido.dataLiberacao);
      const diffDays = Math.ceil((liberacao.getTime() - solicitacao.getTime()) / (1000 * 60 * 60 * 24));
      return total + diffDays;
    }, 0);
    
    const slaMedia = pedidosLiberados.length > 0 ? Math.round(slaTotal / pedidosLiberados.length) : 0;

    return {
      statusData,
      clientVolumeData,
      timelineData,
      kpis: {
        totalNFsArmazenadas: notasFiscais.length,
        totalPedidosPendentes: pedidosLiberacao.length,
        totalPedidosLiberados: pedidosLiberados.length,
        slaMedia
      }
    };
  }, [notasFiscais, pedidosLiberacao, pedidosLiberados]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NFs Armazenadas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{dashboardData.kpis.totalNFsArmazenadas}</div>
            <p className="text-xs text-muted-foreground">Total de notas fiscais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{dashboardData.kpis.totalPedidosPendentes}</div>
            <p className="text-xs text-muted-foreground">Aguardando liberação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitação Confirmada</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{dashboardData.kpis.totalPedidosLiberados}</div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.slaMedia}</div>
            <p className="text-xs text-muted-foreground">dias para liberação</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Notas Fiscais</CardTitle>
            <CardDescription>Distribuição por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Volume por Cliente</CardTitle>
            <CardDescription>Peso total liberado por cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.clientVolumeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ cliente, peso }) => `${cliente}: ${peso}kg`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="peso"
                >
                  {dashboardData.clientVolumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações Confirmadas por Período</CardTitle>
          <CardDescription>Evolução temporal das confirmações</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semana" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pedidos" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}