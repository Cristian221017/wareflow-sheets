import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminTransportadoras } from './SuperAdminTransportadoras';
import { SuperAdminUsuarios } from './SuperAdminUsuarios';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { FormCadastroUsuario } from './FormCadastroUsuario';
import { FormCadastroTransportadora } from './FormCadastroTransportadora';
import LogsPage from './LogsPage';
import { 
  Building2, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  Warehouse,
  Plus,
  UserPlus,
  Menu,
  FileText
} from 'lucide-react';

export function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isTransportadoraDialogOpen, setIsTransportadoraDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { value: "dashboard", label: "Dashboard", icon: BarChart3 },
    { value: "transportadoras", label: "Transportadoras", icon: Building2 },
    { value: "usuarios", label: "Usuários", icon: Users },
    { value: "logs", label: "Logs", icon: FileText },
    { value: "cadastro-usuario", label: "Cadastro", icon: UserPlus },
    { value: "configuracoes", label: "Configurações", icon: Settings },
  ];

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="py-4">
          <div className="flex items-center space-x-2 mb-6">
            <Warehouse className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">WMS Admin</span>
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.value}
                    variant={activeTab === tab.value ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab(tab.value)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                );
              })}
              
              <div className="border-t pt-4 mt-4 space-y-2">
                <Dialog open={isTransportadoraDialogOpen} onOpenChange={setIsTransportadoraDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Transportadora
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                    <FormCadastroTransportadora />
                  </DialogContent>
                </Dialog>

                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                    <FormCadastroUsuario 
                      userType="super_admin" 
                      onSuccess={() => setIsUserDialogOpen(false)} 
                    />
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="border-b bg-card md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <Warehouse className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">WMS Admin</h1>
            </div>
          </div>
          <MobileNav />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="border-b bg-card hidden md:block">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Warehouse className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">WMS Super Admin</h1>
              <p className="text-sm text-muted-foreground">Painel de Administração</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2">
              <Dialog open={isTransportadoraDialogOpen} onOpenChange={setIsTransportadoraDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Transportadora
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormCadastroTransportadora />
                </DialogContent>
              </Dialog>

              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <FormCadastroUsuario 
                    userType="super_admin" 
                    onSuccess={() => setIsUserDialogOpen(false)} 
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <div className="flex items-center justify-end space-x-2">
                <Badge variant="secondary" className="text-xs">Super Admin</Badge>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={logout}
              className="hidden sm:flex"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 max-w-5xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className="flex items-center space-x-2 text-xs lg:text-sm"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <SuperAdminDashboard />
          </TabsContent>

          <TabsContent value="transportadoras">
            <SuperAdminTransportadoras />
          </TabsContent>

          <TabsContent value="usuarios">
            <SuperAdminUsuarios />
          </TabsContent>

          <TabsContent value="logs">
            <LogsPage />
          </TabsContent>

          <TabsContent value="cadastro-usuario">
            <FormCadastroUsuario userType="super_admin" />
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