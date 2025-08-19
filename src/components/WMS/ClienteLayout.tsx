import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWMS } from '@/contexts/WMSContext';
import { ClienteDashboard } from './ClienteDashboard';
import { ClienteMercadoriasTable } from './ClienteMercadoriasTable';
import { ClienteFinanceiro } from './ClienteFinanceiro';
import { ClienteSolicitacaoCarregamento } from './ClienteSolicitacaoCarregamento';
import { 
  Package, 
  FileText, 
  Warehouse,
  LogOut,
  CheckCircle,
  BarChart3,
  Receipt,
  Menu
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function ClienteLayout() {
  const { user, logout } = useAuth();
  const { notasFiscais, pedidosLiberacao, pedidosLiberados } = useWMS();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter data for current client
  const clienteNFs = notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj);
  const clientePedidos = pedidosLiberacao.filter(p => p.cnpjCliente === user?.cnpj);
  const clienteLiberados = pedidosLiberados.filter(p => {
    const pedido = pedidosLiberacao.find(pl => pl.numeroPedido === p.numeroPedido);
    return pedido?.cnpjCliente === user?.cnpj;
  });

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, shortLabel: 'Início' },
    { id: 'mercadorias', label: 'Mercadorias', icon: Package, shortLabel: 'Estoque' },
    { id: 'pedidos', label: 'Carregamento', icon: FileText, shortLabel: 'Pedir' },
    { id: 'liberados', label: 'Confirmadas', icon: CheckCircle, shortLabel: 'OK' },
    { id: 'financeiro', label: 'Financeiro', icon: Receipt, shortLabel: 'Fin' }
  ];

  const MobileNavigation = () => (
    <div className="flex flex-col w-full h-auto space-y-1 bg-transparent p-0">
      {navigationItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setActiveTab(item.id);
            setMobileMenuOpen(false);
          }}
          className={`
            w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors 
            hover:bg-accent hover:text-accent-foreground
            ${activeTab === item.id ? 'bg-accent text-accent-foreground' : ''}
            flex items-center gap-2
          `}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}
    </div>
  );

  const DesktopNavigation = () => (
    <div className="hidden lg:flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
      {navigationItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`
            inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium 
            ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
            ${activeTab === item.id ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50'}
            gap-2 min-w-[100px]
          `}
        >
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
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
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-md 
                  transition-colors hover:bg-muted
                  ${activeTab === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground'}
                `}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.shortLabel}
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
      case 'mercadorias':
        return <ClienteMercadoriasTable />;
      case 'pedidos':
        return <ClienteSolicitacaoCarregamento />;
      case 'liberados':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Confirmados</CardTitle>
              <CardDescription>
                Histórico de solicitações confirmadas e em processo de entrega
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clienteLiberados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum pedido confirmado
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Quando seus pedidos forem confirmados, eles aparecerão aqui
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="grid gap-4 md:hidden">
                    {clienteLiberados.map((pedido) => (
                      <Card key={pedido.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">Pedido #{pedido.numeroPedido}</h4>
                              <p className="text-sm text-muted-foreground">
                                Confirmado em {new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              NF: {pedido.nfVinculada}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Quantidade:</span>
                              <p className="font-medium">{pedido.quantidade}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Transportadora:</span>
                              <p className="font-medium">{pedido.transportadora}</p>
                            </div>
                          </div>
                          
                          {pedido.dataExpedicao && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Expedição:</span>
                              <p className="font-medium">
                                {new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº Pedido</TableHead>
                          <TableHead>Data Confirmação</TableHead>
                          <TableHead>NF Vinculada</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Transportadora</TableHead>
                          <TableHead>Data Expedição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clienteLiberados.map((pedido) => (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                            <TableCell>{new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>{pedido.nfVinculada}</TableCell>
                            <TableCell>{pedido.quantidade}</TableCell>
                            <TableCell>{pedido.transportadora}</TableCell>
                            <TableCell>
                              {pedido.dataExpedicao 
                                ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR')
                                : 'Não informado'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      case 'financeiro':
        return <ClienteFinanceiro />;
      default:
        return <ClienteDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Warehouse className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold whitespace-nowrap">Portal do Cliente</h1>
          </div>
          
          {/* Desktop Navigation - Only visible on desktop */}
          <div className="hidden lg:flex flex-1 justify-center px-8">
            <DesktopNavigation />
          </div>
          
          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            {/* User greeting - Desktop only */}
            <div className="hidden lg:flex items-center text-right">
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                Bem-vindo, {user?.name}
              </p>
            </div>
            
            {/* Desktop Logout */}
            <Button variant="ghost" size="sm" onClick={logout} className="hidden lg:flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="whitespace-nowrap">Sair</span>
            </Button>
            
            {/* Mobile Menu */}
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
                <div className="mt-6 pt-6 border-t">
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
      </header>

      {/* Mobile Tab Bar */}
      <MobileTabBar />

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-6 py-6 space-y-6 max-w-7xl">
        {renderContent()}
      </main>
    </div>
  );
}