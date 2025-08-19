import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Menu,
  X
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Em separação':
      return 'bg-success text-success-foreground';
    case 'Liberada para carregar':
      return 'bg-warning text-warning-foreground';
    case 'Carregamento solicitado':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

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

  const NavigationTabs = ({ isMobile = false }: { isMobile?: boolean }) => (
    <TabsList className={`
      ${isMobile 
        ? 'flex flex-col w-full h-auto space-y-1 bg-transparent p-0' 
        : 'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground'
      }
    `}>
      {navigationItems.map((item) => (
        <TabsTrigger
          key={item.id}
          value={item.id}
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={`
            ${isMobile
              ? 'w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              : 'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
            }
            flex items-center gap-2
          `}
        >
          <item.icon className="w-4 h-4" />
          <span className={isMobile ? '' : 'hidden sm:inline'}>
            {isMobile ? item.label : item.shortLabel}
          </span>
          <span className="hidden lg:inline sm:hidden">
            {item.label}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center space-x-4 lg:space-x-6">
            <Warehouse className="h-6 w-6 text-primary" />
            <div className="hidden md:flex">
              <h1 className="text-lg font-semibold">Portal do Cliente</h1>
            </div>
          </div>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <p className="text-sm text-muted-foreground md:hidden">
                Olá, {user?.name?.split(' ')[0]}
              </p>
              <p className="hidden text-sm text-muted-foreground md:block">
                Bem-vindo, {user?.name}
              </p>
            </div>
            
            <nav className="flex items-center space-x-2">
              {/* Desktop Navigation */}
              <div className="hidden lg:block">
                <NavigationTabs />
              </div>
              
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="lg:hidden h-9 w-9 px-0"
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
                  <NavigationTabs isMobile />
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
              
              {/* Desktop Logout */}
              <Button variant="ghost" size="sm" onClick={logout} className="hidden lg:flex">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Tabs - Below Header */}
      <div className="lg:hidden border-b bg-background">
        <div className="container">
          <div className="overflow-x-auto">
            <div className="flex space-x-1 p-1 min-w-max">
              {navigationItems.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-md data-[state=active]:bg-muted"
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.shortLabel}
                </TabsTrigger>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsContent value="dashboard" className="space-y-6">
            <ClienteDashboard />
          </TabsContent>

          <TabsContent value="mercadorias" className="space-y-6">
            <ClienteMercadoriasTable />
          </TabsContent>

          <TabsContent value="pedidos" className="space-y-6">
            <ClienteSolicitacaoCarregamento />
          </TabsContent>

          <TabsContent value="liberados" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            <ClienteFinanceiro />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}