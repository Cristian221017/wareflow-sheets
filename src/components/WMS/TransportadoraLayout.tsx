import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TransportadoraSidebar } from './TransportadoraSidebar';
import { Dashboard } from './Dashboard';
import { NotasFiscaisTable } from './NotasFiscaisTable';
import { PedidosLiberacaoTable } from './PedidosLiberacaoTable';
import { PedidosLiberadosTable } from './PedidosLiberadosTable';
import { FormNotaFiscal } from './FormNotaFiscal';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { FormCadastroCliente } from './FormCadastroCliente';
import { ImpressaoPedidosLiberados } from './ImpressaoPedidosLiberados';
import { RelatorioControleCargas } from './RelatorioControleCargas';
import { ClientesTable } from './ClientesTable';
import { 
  Plus,
  Warehouse,
  LogOut,
  User,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function TransportadoraLayout() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNFDialogOpen, setIsNFDialogOpen] = useState(false);
  const [isPedidoDialogOpen, setIsPedidoDialogOpen] = useState(false);
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'clientes':
        return <ClientesTable />;
      case 'notas-fiscais':
        return <NotasFiscaisTable />;
      case 'pedidos-liberacao':
        return <PedidosLiberacaoTable />;
      case 'pedidos-liberados':
        return (
          <div className="space-y-6">
            <PedidosLiberadosTable />
            <ImpressaoPedidosLiberados />
          </div>
        );
      case 'relatorios':
        return <RelatorioControleCargas />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <TransportadoraSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="mr-2" />
                  <Warehouse className="w-8 h-8 text-primary" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sistema WMS - Transportadora</h1>
                    <p className="text-sm text-muted-foreground">
                      Bem-vindo, {user?.name}
                    </p>
                  </div>
                </div>
                
                {/* Desktop Menu */}
                <div className="hidden md:flex gap-2">
                  <Button 
                    onClick={() => setActiveTab('clientes')}
                    variant={activeTab === 'clientes' ? 'default' : 'outline'}
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    Clientes
                  </Button>
                  
                  <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-info text-info-foreground hover:bg-info/80">
                        <User className="w-4 h-4 mr-2" />
                        Cadastro de Cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                      <FormCadastroCliente />
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isNFDialogOpen} onOpenChange={setIsNFDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-success text-success-foreground hover:bg-success/80">
                        <Plus className="w-4 h-4 mr-2" />
                        Nova NF
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                      <FormNotaFiscal />
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isPedidoDialogOpen} onOpenChange={setIsPedidoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-warning text-warning-foreground hover:bg-warning/80">
                        <Plus className="w-4 h-4 mr-2" />
                        Ordem de Carregamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                      <FormPedidoLiberacao />
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>

                {/* Mobile Menu */}
                <div className="md:hidden flex gap-2">
                  <Button variant="outline" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Menu className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setActiveTab('clientes')}>
                        <User className="w-4 h-4 mr-2" />
                        Clientes
                      </DropdownMenuItem>
                      
                      <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <User className="w-4 h-4 mr-2" />
                            Cadastro de Cliente
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                          <FormCadastroCliente />
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isNFDialogOpen} onOpenChange={setIsNFDialogOpen}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nova NF
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                          <FormNotaFiscal />
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isPedidoDialogOpen} onOpenChange={setIsPedidoDialogOpen}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Ordem de Carregamento
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                          <FormPedidoLiberacao />
                        </DialogContent>
                      </Dialog>

                      <DropdownMenuItem onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}