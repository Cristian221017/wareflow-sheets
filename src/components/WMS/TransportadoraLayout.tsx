import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
  const [isNFDialogOpen, setIsNFDialogOpen] = useState(false);
  const [isPedidoDialogOpen, setIsPedidoDialogOpen] = useState(false);
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false);
  const [showClientes, setShowClientes] = useState(false);

  if (showClientes) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Warehouse className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Sistema WMS - Transportadora</h1>
                  <p className="text-gray-600">Bem-vindo, {user?.name}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowClientes(false)}
                  variant="outline"
                >
                  Voltar
                </Button>
                <Button onClick={logout} variant="outline">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <ClientesTable />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div className="flex items-center">
              <Warehouse className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sistema WMS - Transportadora</h1>
                <p className="text-gray-600">Bem-vindo, {user?.name}</p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex gap-3">
              <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <User className="w-4 h-4 mr-2" />
                    Cadastro de Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormCadastroCliente />
                </DialogContent>
              </Dialog>

              <Button 
                onClick={() => setShowClientes(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Clientes
              </Button>

              <Dialog open={isNFDialogOpen} onOpenChange={setIsNFDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
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
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Ordem de Carregamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormPedidoLiberacao />
                </DialogContent>
              </Dialog>

              <Button onClick={logout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex gap-2">
              <Button onClick={logout} variant="outline">
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

                  <DropdownMenuItem onClick={() => setShowClientes(true)}>
                    <User className="w-4 h-4 mr-2" />
                    Clientes
                  </DropdownMenuItem>

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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="notas-fiscais">Notas Fiscais</TabsTrigger>
              <TabsTrigger value="pedidos-liberacao">Ordem de Carregamento</TabsTrigger>
              <TabsTrigger value="pedidos-liberados">Solicitação Confirmada</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="space-y-4">
              <Dashboard />
            </TabsContent>
            
            <TabsContent value="notas-fiscais" className="space-y-4">
              <NotasFiscaisTable />
            </TabsContent>
            
            <TabsContent value="pedidos-liberacao" className="space-y-4">
              <PedidosLiberacaoTable />
            </TabsContent>
            
            <TabsContent value="pedidos-liberados" className="space-y-4">
              <div className="space-y-6">
                <PedidosLiberadosTable />
                <ImpressaoPedidosLiberados />
              </div>
            </TabsContent>
            
            <TabsContent value="relatorios" className="space-y-4">
              <RelatorioControleCargas />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}