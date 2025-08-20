import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Package, Clock, CheckCircle, TrendingUp, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWMS } from '@/contexts/WMSContext';
import { useMemo, useState } from 'react';
import { createAccountsForExistingClients } from '@/utils/createClientAccounts';
import { resetClientPasswords } from '@/utils/resetClientPasswords';
import { testClientLogin } from '@/utils/testClientLogin';
import { fixClientPasswords } from '@/utils/fixClientPasswords';
import { diagnoseClientAuth } from '@/utils/diagnoseClientAuth';
import { fixSpecificUser } from '@/utils/fixSpecificUser';
import { debugSpecificUser } from '@/utils/debugSpecificUser';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--error))'];

export function Dashboard() {
  const { notasFiscais, pedidosLiberacao, pedidosLiberados } = useWMS();
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [isResettingPasswords, setIsResettingPasswords] = useState(false);
  const [isTestingLogin, setIsTestingLogin] = useState(false);
  const [isFixingPasswords, setIsFixingPasswords] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isFixingSpecific, setIsFixingSpecific] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);

  const handleCreateAccounts = async () => {
    setIsCreatingAccounts(true);
    try {
      await createAccountsForExistingClients('cliente123');
      toast.success('Contas criadas com sucesso! Senha padrão: cliente123');
    } catch (error) {
      toast.error('Erro ao criar contas. Verifique o console.');
    } finally {
      setIsCreatingAccounts(false);
    }
  };

  const handleResetPasswords = async () => {
    setIsResettingPasswords(true);
    try {
      await resetClientPasswords();
      toast.success('Verificação de senhas concluída! Verifique o console.');
    } catch (error) {
      toast.error('Erro ao verificar senhas. Verifique o console.');
    } finally {
      setIsResettingPasswords(false);
    }
  };

  const handleTestLogin = async () => {
    setIsTestingLogin(true);
    try {
      await testClientLogin();
      toast.success('Teste de login concluído! Verifique o console para detalhes.');
    } catch (error) {
      toast.error('Erro no teste de login. Verifique o console.');
    } finally {
      setIsTestingLogin(false);
    }
  };

  const handleFixPasswords = async () => {
    setIsFixingPasswords(true);
    try {
      await fixClientPasswords();
      toast.success('Correção de senhas concluída! Verifique o console e emails.');
    } catch (error) {
      toast.error('Erro na correção de senhas. Verifique o console.');
    } finally {
      setIsFixingPasswords(false);
    }
  };

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      await diagnoseClientAuth();
      toast.success('Diagnóstico concluído! Verifique o console para detalhes.');
    } catch (error) {
      toast.error('Erro no diagnóstico. Verifique o console.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleFixSpecific = async () => {
    setIsFixingSpecific(true);
    try {
      await fixSpecificUser();
      toast.success('Correção específica concluída! Verifique o console e email.');
    } catch (error) {
      toast.error('Erro na correção. Verifique o console.');
    } finally {
      setIsFixingSpecific(false);
    }
  };

  const handleDebugSpecific = async () => {
    setIsDebugging(true);
    try {
      await debugSpecificUser();
      toast.success('Debug concluído! Verifique o console para diagnóstico detalhado.');
    } catch (error) {
      toast.error('Erro no debug. Verifique o console.');
    } finally {
      setIsDebugging(false);
    }
  };

  const dashboardData = useMemo(() => {
    // Status distribution
    const statusData = [
      { 
        name: 'Armazenada', 
        value: notasFiscais.filter(nf => nf.status === 'Armazenada').length,
        color: COLORS[0]
      },
      { 
        name: 'Ordem Solicitada',
        value: notasFiscais.filter(nf => nf.status === 'Ordem Solicitada').length,
        color: COLORS[1]
      },
      { 
        name: 'Solicitação Confirmada',
        value: notasFiscais.filter(nf => nf.status === 'Solicitação Confirmada').length,
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
      {/* Botão temporário para criar contas de clientes */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/10 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <UserPlus className="h-5 w-5" />
            Setup Inicial - Criar Contas de Login
          </CardTitle>
          <CardDescription className="text-yellow-700 dark:text-yellow-300">
            <strong>Para resolver o problema específico do Comercial@rodoveigatransportes.com.br:</strong><br/>
            1. <strong>Corrigir Usuário Específico</strong> - Corrige o problema específico deste email<br/>
            2. <strong>Diagnóstico Completo</strong> - Verifica situação de todos os clientes<br/>
            3. <strong>Testar Login</strong> - Confirma se conseguem acessar com senha: <strong>cliente123</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleDebugSpecific} 
              disabled={isDebugging}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isDebugging ? 'Debugando...' : 'Debug Específico'}
            </Button>
            <Button 
              onClick={handleFixSpecific} 
              disabled={isFixingSpecific}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isFixingSpecific ? 'Corrigindo...' : 'Corrigir Usuário Específico'}
            </Button>
            <Button 
              onClick={handleDiagnose} 
              disabled={isDiagnosing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isDiagnosing ? 'Diagnosticando...' : 'Diagnóstico Completo'}
            </Button>
            <Button 
              onClick={handleCreateAccounts} 
              disabled={isCreatingAccounts}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isCreatingAccounts ? 'Criando contas...' : 'Criar Contas'}
            </Button>
            <Button 
              onClick={handleTestLogin} 
              disabled={isTestingLogin}
              variant="outline"
              className="border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              {isTestingLogin ? 'Testando...' : 'Testar Login'}
            </Button>
            <Button 
              onClick={handleFixPasswords} 
              disabled={isFixingPasswords}
              variant="outline"
              className="border-red-600 text-red-700 hover:bg-red-50"
            >
              {isFixingPasswords ? 'Corrigindo...' : 'Corrigir Senhas'}
            </Button>
            <Button 
              onClick={handleResetPasswords} 
              disabled={isResettingPasswords}
              variant="outline"
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-50"
            >
              {isResettingPasswords ? 'Verificando...' : 'Resetar Senhas'}
            </Button>
          </div>
        </CardContent>
      </Card>

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