import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from './Dashboard';
import { NotasFiscaisTable } from './NotasFiscaisTable';
import { PedidosLiberacaoTable } from './PedidosLiberacaoTable';
import { PedidosLiberadosTable } from './PedidosLiberadosTable';
import { FormNotaFiscal } from './FormNotaFiscal';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { FormCadastroCliente } from './FormCadastroCliente';
import { ImpressaoPedidosLiberados } from './ImpressaoPedidosLiberados';
import { RelatorioControleCargas } from './RelatorioControleCargas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { 
  BarChart3, 
  Package, 
  FileText, 
  CheckCircle, 
  Plus,
  Warehouse,
  LogOut,
  User,
  Printer,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function TransportadoraLayout() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNFDialogOpen, setIsNFDialogOpen] = useState(false);
  const [isPedidoDialogOpen, setIsPedidoDialogOpen] = useState(false);
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
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
                    Solicitar Liberação
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
                        Solicitar Liberação
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
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-max">
            <TabsTrigger value="dashboard" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="notas-fiscais" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
              <Package className="w-4 h-4" />
              Notas Fiscais
            </TabsTrigger>
            <TabsTrigger value="pedidos-liberacao" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
              <FileText className="w-4 h-4" />
              Ordem de Carregamento
            </TabsTrigger>
            <TabsTrigger value="pedidos-liberados" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
              <CheckCircle className="w-4 h-4" />
              Solicitação Confirmada
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="notas-fiscais">
            <NotasFiscaisTable />
          </TabsContent>

          <TabsContent value="pedidos-liberacao">
            <PedidosLiberacaoTable />
          </TabsContent>

          <TabsContent value="pedidos-liberados">
            <div className="space-y-6">
              <PedidosLiberadosTable />
              <ImpressaoPedidosLiberados />
            </div>
          </TabsContent>

          <TabsContent value="relatorios">
            <RelatorioControleCargas />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}