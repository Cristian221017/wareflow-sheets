import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Clock, CheckCircle, X, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWMS } from '@/contexts/WMSContext';
import { PedidoLiberacao } from '@/types/wms';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  transportadora: z.string().min(1, 'Transportadora é obrigatória'),
  dataExpedicao: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

function AprovarDialog({ pedido }: { pedido: PedidoLiberacao }) {
  const { liberarPedido } = useWMS();
  const [open, setOpen] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transportadora: '',
      dataExpedicao: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await liberarPedido(pedido.id, data.transportadora, data.dataExpedicao);
      toast.success(`Pedido aprovado e liberado para a transportadora: ${data.transportadora}`);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Erro ao aprovar pedido:', error);
      toast.error('Erro ao aprovar pedido');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-success border-success hover:bg-success hover:text-success-foreground"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprovar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Aprovar Pedido de Liberação
          </DialogTitle>
          <DialogDescription>
            Pedido: {pedido.numeroPedido} - NF: {pedido.nfVinculada}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transportadora"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transportadora Responsável *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da transportadora" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataExpedicao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Expedição (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-success text-success-foreground hover:bg-success/80">
                Confirmar Aprovação
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function SolicitacoesPendentesTable() {
  const { pedidosLiberacao } = useWMS();

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta':
        return 'bg-destructive text-destructive-foreground';
      case 'Média':
        return 'bg-warning text-warning-foreground';
      case 'Baixa':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleRejeitar = (pedido: PedidoLiberacao) => {
    // TODO: Implementar lógica de rejeição (remover da lista ou marcar como rejeitado)
    toast.error(`Solicitação de carregamento rejeitada para NF: ${pedido.nfVinculada}`);
  };

  const pedidosPendentes = pedidosLiberacao.filter(p => p.status === 'Em análise');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Solicitações Pendentes
        </CardTitle>
        <CardDescription>
          Solicitações de carregamento enviadas pelos clientes aguardando aprovação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF Vinculada</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosPendentes.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.nfVinculada}</TableCell>
                  <TableCell>{pedido.numeroPedido}</TableCell>
                  <TableCell>{pedido.ordemCompra}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.produto}</TableCell>
                  <TableCell>{pedido.quantidade}</TableCell>
                  <TableCell>{pedido.peso.toFixed(1)}</TableCell>
                  <TableCell>{pedido.volume.toFixed(2)}</TableCell>
                  <TableCell>{new Date(pedido.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(pedido.prioridade)}>
                      {pedido.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      <AprovarDialog pedido={pedido} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejeitar(pedido)}
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pedidosPendentes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de carregamento pendente</p>
            <p className="text-sm mt-1">As solicitações dos clientes aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}