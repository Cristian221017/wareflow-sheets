import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWMS } from '@/contexts/WMSContext';
import { PedidoLiberacao } from '@/types/wms';
import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const getPriorityColor = (prioridade: PedidoLiberacao['prioridade']) => {
  switch (prioridade) {
    case 'Alta':
      return 'bg-destructive text-destructive-foreground';
    case 'Média':
      return 'bg-warning text-warning-foreground';
    case 'Baixa':
      return 'bg-success text-success-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function PedidosLiberacaoTable() {
  const { pedidosLiberacao, liberarPedido, deletePedidoLiberacao } = useWMS();
  const [selectedPedido, setSelectedPedido] = useState<PedidoLiberacao | null>(null);
  const [solicitanteLiberacao, setSolicitanteLiberacao] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLiberar = () => {
    if (selectedPedido) {
      liberarPedido(selectedPedido.id, solicitanteLiberacao, dataExpedicao || undefined);
      setIsDialogOpen(false);
      setSelectedPedido(null);
      setSolicitanteLiberacao('');
      setDataExpedicao('');
    }
  };

  const handleDelete = async (pedido: PedidoLiberacao) => {
    if (window.confirm(`Tem certeza que deseja excluir o pedido ${pedido.numeroPedido}? Esta ação não pode ser desfeita.`)) {
      try {
        await deletePedidoLiberacao(pedido.id);
      } catch (error) {
        toast.error('Erro ao excluir pedido de liberação');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordem de Carregamento</CardTitle>
        <CardDescription>
          Pedidos aguardando análise e liberação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>NF Vinculada</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosLiberacao.map((pedido) => (
                <TableRow 
                  key={pedido.id}
                  className={cn(
                    pedido.prioridade === 'Alta' 
                      ? 'bg-destructive/10 hover:bg-destructive/20 border-l-4 border-l-destructive' 
                      : ''
                  )}
                >
                  <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                  <TableCell>{pedido.ordemCompra}</TableCell>
                  <TableCell>{new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.cnpjCliente}</TableCell>
                  <TableCell>{pedido.nfVinculada}</TableCell>
                  <TableCell>{pedido.produto}</TableCell>
                  <TableCell>{pedido.quantidade}</TableCell>
                  <TableCell>{pedido.peso.toFixed(1)}</TableCell>
                  <TableCell>{pedido.volume.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(pedido.prioridade)}>
                      {pedido.prioridade === 'Alta' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {pedido.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>{pedido.responsavel}</TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                         <DialogTrigger asChild>
                           <Button 
                             size="sm" 
                             onClick={() => setSelectedPedido(pedido)}
                             className="bg-success text-success-foreground hover:bg-success/80"
                           >
                             <CheckCircle className="w-4 h-4 mr-1" />
                             Liberar
                           </Button>
                         </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Liberar Pedido</DialogTitle>
                          <DialogDescription>
                            Confirme os dados para liberação do pedido {selectedPedido?.numeroPedido}
                          </DialogDescription>
                        </DialogHeader>
                         <div className="grid gap-4 py-4">
                           <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="solicitanteLiberacao" className="text-right">
                               Solicitante
                             </Label>
                             <Input
                               id="solicitanteLiberacao"
                               value={solicitanteLiberacao}
                               onChange={(e) => setSolicitanteLiberacao(e.target.value)}
                               className="col-span-3"
                               placeholder="Nome do solicitante da liberação"
                             />
                           </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dataExpedicao" className="text-right">
                              Data Expedição
                            </Label>
                            <Input
                              id="dataExpedicao"
                              type="date"
                              value={dataExpedicao}
                              onChange={(e) => setDataExpedicao(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                           <Button 
                             type="submit" 
                             onClick={handleLiberar}
                             disabled={!solicitanteLiberacao}
                             className="bg-success text-success-foreground hover:bg-success/80"
                           >
                            Confirmar Liberação
                          </Button>
                         </DialogFooter>
                       </DialogContent>
                     </Dialog>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handleDelete(pedido)}
                       className="text-destructive hover:text-destructive"
                       title="Excluir pedido"
                     >
                       <Trash2 className="w-3 h-3" />
                     </Button>
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}