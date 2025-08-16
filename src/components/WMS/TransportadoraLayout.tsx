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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sistema WMS - Transportadora</h1>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo, {user?.name}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-info text-info-foreground hover:bg-info/80">
                    <User className="w-4 h-4 mr-2" />
                    Cadastro de Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <FormPedidoLiberacao />
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="notas-fiscais" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Notas Fiscais
            </TabsTrigger>
            <TabsTrigger value="pedidos-liberacao" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pedidos de Liberação
            </TabsTrigger>
            <TabsTrigger value="pedidos-liberados" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Pedidos Liberados
            </TabsTrigger>
            <TabsTrigger value="impressao" className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Relatórios
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
            <PedidosLiberadosTable />
          </TabsContent>

          <TabsContent value="impressao">
            <ImpressaoPedidosLiberados />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}