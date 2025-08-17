import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminTransportadoras } from './SuperAdminTransportadoras';
import { SuperAdminUsuarios } from './SuperAdminUsuarios';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { 
  Building2, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  Warehouse
} from 'lucide-react';

export function SuperAdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Warehouse className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">WMS Super Admin</h1>
              <p className="text-sm text-muted-foreground">Painel de Administração</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Super Admin</Badge>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="transportadoras" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Transportadoras</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SuperAdminDashboard />
          </TabsContent>

          <TabsContent value="transportadoras">
            <SuperAdminTransportadoras />
          </TabsContent>

          <TabsContent value="usuarios">
            <SuperAdminUsuarios />
          </TabsContent>

          <TabsContent value="configuracoes">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Configurações gerais do sistema WMS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Configurações em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}