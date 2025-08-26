import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { log, warn, error as logError } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardStats {
  totalTransportadoras: number;
  transportadorasAtivas: number;
  totalUsuarios: number;
  usuariosPendentes: number;
}

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTransportadoras: 0,
    transportadorasAtivas: 0,
    totalUsuarios: 0,
    usuariosPendentes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get transportadoras stats
      const { data: transportadoras, error: transpError } = await supabase
        .from('transportadoras')
        .select('status');

      if (transpError) {
        logError('Error loading transportadoras:', transpError);
      }

      // Get users stats
      const { data: usuarios, error: usersError } = await supabase
        .from('user_transportadoras')
        .select('is_active');

      if (usersError) {
        logError('Error loading users:', usersError);
      }

      // Get profiles count
      const { count: profilesCount, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) {
        logError('Error loading profiles count:', profilesError);
      }

      const transportadorasData = transportadoras || [];
      const usuariosData = usuarios || [];

      setStats({
        totalTransportadoras: transportadorasData.length,
        transportadorasAtivas: transportadorasData.filter(t => t.status === 'ativo').length,
        totalUsuarios: profilesCount || 0,
        usuariosPendentes: usuariosData.filter(u => !u.is_active).length
      });
    } catch (error) {
      logError('Error in loadDashboardStats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transportadoras
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransportadoras}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{stats.transportadorasAtivas} ativas</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transportadoras Ativas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transportadorasAtivas}</div>
            <div className="text-xs text-muted-foreground">
              {stats.totalTransportadoras > 0 ? 
                `${((stats.transportadorasAtivas / stats.totalTransportadoras) * 100).toFixed(1)}% do total` 
                : '0% do total'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
            <div className="text-xs text-muted-foreground">
              Perfis cadastrados
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usuários Pendentes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usuariosPendentes}</div>
            <div className="text-xs text-muted-foreground">
              Aguardando aprovação
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas ações no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sistema inicializado</p>
                  <p className="text-xs text-muted-foreground">Banco de dados criado com sucesso</p>
                </div>
                <Badge variant="secondary">Agora</Badge>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Estrutura multi-tenant configurada</p>
                  <p className="text-xs text-muted-foreground">RLS e permissões implementadas</p>
                </div>
                <Badge variant="secondary">Agora</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>
              Saúde geral da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Banco de Dados</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Autenticação</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">API</span>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Funcionando
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}