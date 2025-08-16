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
import { AlertTriangle, CheckCircle } from 'lucide-react';
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
  const { pedidosLiberacao, liberarPedido } = useWMS();
  const [selectedPedido, setSelectedPedido] = useState<PedidoLiberacao | null>(null);
  const [transportadora, setTransportadora] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLiberar = () => {
    if (selectedPedido) {
      liberarPedido(selectedPedido.id, transportadora, dataExpedicao || undefined);
      setIsDialogOpen(false);
      setSelectedPedido(null);
      setTransportadora('');
      setDataExpedicao('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos de Liberação</CardTitle>
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
                            <Label htmlFor="transportadora" className="text-right">
                              Transportadora
                            </Label>
                            <Input
                              id="transportadora"
                              value={transportadora}
                              onChange={(e) => setTransportadora(e.target.value)}
                              className="col-span-3"
                              placeholder="Nome da transportadora"
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
                            disabled={!transportadora}
                            className="bg-success text-success-foreground hover:bg-success/80"
                          >
                            Confirmar Liberação
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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