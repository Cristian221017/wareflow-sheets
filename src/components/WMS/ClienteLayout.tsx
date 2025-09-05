import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useWMS } from '@/contexts/WMSContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useLastVisit } from '@/hooks/useLastVisit';
import { NotificationBadge } from '@/components/ui/notification-badge';

import { ClienteDashboard } from './ClienteDashboard';

import { ClienteSolicitacaoCarregamento } from './ClienteSolicitacaoCarregamento';
import { ClienteStatusSeparacao } from './ClienteStatusSeparacao';
import { FinanceiroCliente } from './FinanceiroCliente';
import { PedidosConfirmadosTable } from './PedidosConfirmadosTable';
import { FormCadastroUsuario } from './FormCadastroUsuario';
import { GestaoUsuariosCliente } from './GestaoUsuariosCliente';
import { EnvironmentBadge, EnvironmentIndicator } from '@/components/system/EnvironmentBadge';
import { ApiStatusIndicator } from '@/components/system/ApiStatusIndicator';

import { 
  Package, 
  FileText, 
  Warehouse,
  LogOut,
  CheckCircle,
  BarChart3,
  Receipt,
  Menu,
  UserPlus,
  Home
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function ClienteLayout() {
  const { user, logout } = useAuth();
  const { notasFiscais, pedidosLiberacao, pedidosLiberados } = useWMS();
  const notifications = useNotifications();
  const { markAsVisited } = useLastVisit();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Filter data for current client
  const clienteNFs = notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj);
  const clientePedidos = pedidosLiberacao.filter(p => p.cnpjCliente === user?.cnpj);
  const clienteLiberados = pedidosLiberados.filter(p => {
    const pedido = pedidosLiberacao.find(pl => pl.numeroPedido === p.numeroPedido);
    return pedido?.cnpjCliente === user?.cnpj;
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Marcar como visitado baseado na aba - força re-render das notificações
    setTimeout(() => {
      switch (tabId) {
        case 'liberados':
          markAsVisited('pedidos-liberados');
          break;
        case 'financeiro':
          markAsVisited('documentos_financeiros');
          break;
      }
    }, 100);
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, shortLabel: 'Home', notification: 0 },
    { id: 'status-separacao', label: 'Mercadorias Armazenadas', icon: Package, shortLabel: 'Armazenadas', notification: 0 },
    { id: 'pedidos', label: 'Carregamentos Solicitados', icon: FileText, shortLabel: 'Solicitados', notification: 0 },
    { id: 'liberados', label: 'Carregamentos Confirmados', icon: CheckCircle, shortLabel: 'Confirmados', notification: notifications.pedidosLiberados },
    { id: 'financeiro', label: 'Financeiro', icon: Receipt, shortLabel: 'Fin', notification: notifications.documentosFinanceiros },
    { id: 'cadastro-usuario', label: 'Cadastro de Usuários', icon: UserPlus, shortLabel: 'Users', notification: 0 }
  ];

  const MobileNavigation = () => (
    <div className="flex flex-col w-full h-auto space-y-1 bg-transparent p-0">
      {navigationItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            handleTabChange(item.id);
            setMobileMenuOpen(false);
          }}
          className={`
            w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors 
            hover:bg-accent hover:text-accent-foreground
            ${activeTab === item.id ? 'bg-accent text-accent-foreground' : ''}
            flex items-center gap-2
          `}
        >
          <div className="flex items-center gap-2 w-full">
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
            <NotificationBadge count={item.notification} />
          </div>
        </button>
      ))}
    </div>
  );

  const MobileTabBar = () => (
    <div className="lg:hidden border-b bg-background">
      <div className="container">
        <div className="overflow-x-auto">
          <div className="flex space-x-1 p-1 min-w-max">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-md 
                  transition-colors hover:bg-muted
                  ${activeTab === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground'}
                `}
              >
                <div className="flex items-center gap-1.5">
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.shortLabel}</span>
                  <NotificationBadge count={item.notification} className="scale-75" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ClienteDashboard />;
      case 'status-separacao':
        return <ClienteStatusSeparacao />;
      case 'pedidos':
        return <ClienteSolicitacaoCarregamento />;
      case 'liberados':
        return <PedidosConfirmadosTable />;
      case 'financeiro':
        return <FinanceiroCliente />;
      case 'cadastro-usuario':
        return <GestaoUsuariosCliente />;
      default:
        return <ClienteDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
              <Warehouse className="h-5 w-5 text-primary" />
              <h1 className="text-base lg:text-lg font-semibold truncate">Portal do Cliente</h1>
            </div>
            
            <div className="hidden lg:flex flex-1 justify-center mx-4">
              <div className="flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground max-w-fit">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`
                      inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium 
                      ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 
                      focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                      ${activeTab === item.id ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50'}
                      gap-1.5
                    `}
                  >
                    <div className="flex items-center gap-1.5">
                      <item.icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                      <span className="xl:hidden">{item.shortLabel}</span>
                      <NotificationBadge count={item.notification} className="scale-75" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              {user?.role === 'cliente' && (
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden lg:flex">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <FormCadastroUsuario 
                      userType="cliente" 
                      onSuccess={() => setIsUserDialogOpen(false)} 
                    />
                  </DialogContent>
                </Dialog>
              )}

              <div className="hidden 2xl:block">
                <p className="text-sm text-muted-foreground max-w-[120px] truncate">
                  Olá, {user?.name?.split(' ')[0]}
                </p>
              </div>
              
              <div className="hidden xl:flex">
                <ApiStatusIndicator />
              </div>
              
              <Button variant="ghost" size="sm" onClick={logout} className="hidden lg:flex p-2">
                <LogOut className="h-4 w-4" />
              </Button>
              
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="lg:hidden h-9 w-9 p-0"
                    size="sm"
                  >
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <div className="flex items-center space-x-2 pb-4">
                    <Warehouse className="h-5 w-5" />
                    <span className="font-semibold">Portal do Cliente</span>
                  </div>
                  <MobileNavigation />
                  <div className="mt-6 pt-6 border-t space-y-2">
                    {user?.role === 'cliente' && (
                      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Novo Usuário
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <FormCadastroUsuario 
                            userType="cliente" 
                            onSuccess={() => setIsUserDialogOpen(false)} 
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button 
                      variant="ghost" 
                      onClick={logout}
                      className="w-full justify-start"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <EnvironmentIndicator />
      <MobileTabBar />

      <main className="container mx-auto px-4 lg:px-6 py-6 space-y-6 max-w-7xl">
        <EnvironmentBadge />
        {renderContent()}
      </main>
    </div>
  );
}