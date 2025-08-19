import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useWMS } from '@/contexts/WMSContext';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { ClienteDashboard } from './ClienteDashboard';
import { ClienteMercadoriasTable } from './ClienteMercadoriasTable';
import { ClienteFinanceiro } from './ClienteFinanceiro';
import { 
  Package, 
  FileText, 
  Plus,
  Warehouse,
  LogOut,
  CheckCircle,
  BarChart3,
  Receipt
} from 'lucide-react';
import { ClienteSolicitacaoCarregamento } from './ClienteSolicitacaoCarregamento';
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
  const [isPedidoDialogOpen, setIsPedidoDialogOpen] = useState(false);

  // Filter data for current client
  const clienteNFs = notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj);
  const clientePedidos = pedidosLiberacao.filter(p => p.cnpjCliente === user?.cnpj);
  const clienteLiberados = pedidosLiberados.filter(p => {
    // Find related pedido to get client CNPJ
    const pedido = pedidosLiberacao.find(pl => pl.numeroPedido === p.numeroPedido);
    return pedido?.cnpjCliente === user?.cnpj;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Portal do Cliente</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Bem-vindo, {user?.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={logout} className="text-xs sm:text-sm">
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex h-9 sm:h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-max">
              <TabsTrigger value="dashboard" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1 sm:gap-2">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="mercadorias" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1 sm:gap-2">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Mercadorias</span>
                <span className="sm:hidden">Estoque</span>
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1 sm:gap-2">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Carregamento</span>
                <span className="sm:hidden">Pedir</span>
              </TabsTrigger>
              <TabsTrigger value="liberados" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1 sm:gap-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Confirmadas</span>
                <span className="sm:hidden">OK</span>
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1 sm:gap-2">
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Financeiro</span>
                <span className="sm:hidden">$</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <ClienteDashboard />
          </TabsContent>

          <TabsContent value="mercadorias">
            <ClienteMercadoriasTable />
          </TabsContent>

          <TabsContent value="pedidos">
            <ClienteSolicitacaoCarregamento />
          </TabsContent>

          <TabsContent value="liberados">
            <Card>
              <CardHeader>
                <CardTitle>Pedidos Confirmados</CardTitle>
                <CardDescription>
                  Histórico de solicitações confirmadas e em processo de entrega
                </CardDescription>
              </CardHeader>
               <CardContent>
                 {/* Mobile Card View */}
                 <div className="block sm:hidden space-y-4">
                   {clienteLiberados.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                       <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                       <p>Nenhum pedido confirmado encontrado</p>
                     </div>
                   ) : (
                     clienteLiberados.map((pedido) => (
                       <Card key={pedido.id} className="p-4">
                         <div className="space-y-2">
                           <div className="flex justify-between items-start">
                             <span className="font-medium text-sm">Pedido #{pedido.numeroPedido}</span>
                             <Badge variant="outline" className="text-xs">
                               NF: {pedido.nfVinculada}
                             </Badge>
                           </div>
                           <div className="grid grid-cols-2 gap-2 text-xs">
                             <div>
                               <span className="text-muted-foreground">Confirmação:</span>
                               <p className="font-medium">{new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}</p>
                             </div>
                             <div>
                               <span className="text-muted-foreground">Quantidade:</span>
                               <p className="font-medium">{pedido.quantidade}</p>
                             </div>
                             <div>
                               <span className="text-muted-foreground">Transportadora:</span>
                               <p className="font-medium">{pedido.transportadora}</p>
                             </div>
                             <div>
                               <span className="text-muted-foreground">Expedição:</span>
                               <p className="font-medium">
                                 {pedido.dataExpedicao 
                                   ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR')
                                   : 'Não informado'
                                 }
                               </p>
                             </div>
                           </div>
                         </div>
                       </Card>
                     ))
                   )}
                 </div>

                 {/* Desktop Table View */}
                 <div className="hidden sm:block overflow-auto">
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
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro">
            <ClienteFinanceiro />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}