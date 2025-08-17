import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useWMS } from '@/contexts/WMSContext';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { ClienteDashboard } from './ClienteDashboard';
import { ClienteMercadoriasTable } from './ClienteMercadoriasTable';
import { 
  Package, 
  FileText, 
  Plus,
  Warehouse,
  LogOut,
  User,
  BarChart3
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Armazenada':
      return 'bg-success text-success-foreground';
    case 'Em Separação':
      return 'bg-warning text-warning-foreground';
    case 'Liberada':
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Portal do Cliente</h1>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo, {user?.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog open={isPedidoDialogOpen} onOpenChange={setIsPedidoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-warning text-warning-foreground hover:bg-warning/80">
                    <Plus className="w-4 h-4 mr-2" />
                    Solicitar Carregamento
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
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-max">
              <TabsTrigger value="dashboard" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="mercadorias" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
                <Package className="w-4 h-4" />
                Mercadorias Armazenadas
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
                <FileText className="w-4 h-4" />
                Meus Pedidos
              </TabsTrigger>
              <TabsTrigger value="liberados" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2">
                <User className="w-4 h-4" />
                Solicitação Confirmada
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
            <Card>
              <CardHeader>
                <CardTitle>Ordem de Carregamento</CardTitle>
                <CardDescription>
                  Acompanhe o status das suas ordens de carregamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Pedido</TableHead>
                        <TableHead>Data Solicitação</TableHead>
                        <TableHead>NF Vinculada</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientePedidos.map((pedido) => (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                          <TableCell>{new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{pedido.nfVinculada}</TableCell>
                          <TableCell>{pedido.produto}</TableCell>
                          <TableCell>{pedido.quantidade}</TableCell>
                          <TableCell>
                            <Badge variant={pedido.prioridade === 'Alta' ? 'destructive' : 'secondary'}>
                              {pedido.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{pedido.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liberados">
            <Card>
              <CardHeader>
                <CardTitle>Solicitação Confirmada</CardTitle>
                <CardDescription>
                  Histórico de solicitações confirmadas e em processo de entrega
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
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
        </Tabs>
      </main>
    </div>
  );
}