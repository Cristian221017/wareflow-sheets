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
import { 
  BarChart3, 
  Package, 
  FileText, 
  CheckCircle, 
  Plus,
  Warehouse,
  LogOut,
  User,
  Printer
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
            
            <div className="flex flex-wrap gap-2">
              <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-info text-info-foreground hover:bg-info/80 text-xs sm:text-sm">
                    <User className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Cadastro de Cliente</span>
                    <span className="sm:hidden">Cliente</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormCadastroCliente />
                </DialogContent>
              </Dialog>

              <Dialog open={isNFDialogOpen} onOpenChange={setIsNFDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-success text-success-foreground hover:bg-success/80 text-xs sm:text-sm">
                    <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Nova NF</span>
                    <span className="sm:hidden">NF</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormNotaFiscal />
                </DialogContent>
              </Dialog>

              <Dialog open={isPedidoDialogOpen} onOpenChange={setIsPedidoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-warning text-warning-foreground hover:bg-warning/80 text-xs sm:text-sm">
                    <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Solicitar Liberação</span>
                    <span className="sm:hidden">Liberação</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormPedidoLiberacao />
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={logout} className="text-xs sm:text-sm">
                <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
                <span className="sm:hidden">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 text-xs sm:text-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="notas-fiscais" className="flex items-center gap-1 sm:gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Notas Fiscais</span>
              <span className="sm:hidden">NFs</span>
            </TabsTrigger>
            <TabsTrigger value="pedidos-liberacao" className="flex items-center gap-1 sm:gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">Pedidos de Liberação</span>
              <span className="lg:hidden">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="pedidos-liberados" className="flex items-center gap-1 sm:gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden lg:inline">Pedidos Liberados</span>
              <span className="lg:hidden">Liberados</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-1 sm:gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Rel.</span>
            </TabsTrigger>
          </TabsList>

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