import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from './Dashboard';
import { NotasFiscaisTable } from './NotasFiscaisTable';
import { PedidosLiberacaoTable } from './PedidosLiberacaoTable';
import { PedidosLiberadosTable } from './PedidosLiberadosTable';
import { FormNotaFiscal } from './FormNotaFiscal';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  Package, 
  FileText, 
  CheckCircle, 
  Plus,
  Warehouse
} from 'lucide-react';

export function WMSLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNFDialogOpen, setIsNFDialogOpen] = useState(false);
  const [isPedidoDialogOpen, setIsPedidoDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sistema WMS</h1>
                <p className="text-sm text-muted-foreground">Warehouse Management System</p>
              </div>
            </div>
            
            <div className="flex gap-2">
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
        </Tabs>
      </main>
    </div>
  );
}