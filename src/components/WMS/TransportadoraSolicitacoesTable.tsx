import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWMS } from '@/contexts/WMSContext';
import { Truck, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Ordem Solicitada':
      return 'bg-warning text-warning-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const aprovarFormSchema = z.object({
  transportadora: z.string().min(1, 'Transportadora é obrigatória'),
  dataExpedicao: z.string().optional()
});

const recusaFormSchema = z.object({
  responsavel: z.string().min(1, 'Responsável é obrigatório'),
  motivo: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres')
});

type AprovarFormData = z.infer<typeof aprovarFormSchema>;
type RecusaFormData = z.infer<typeof recusaFormSchema>;

function AprovarDialog({ nf }: { nf: any }) {
  const { updateNotaFiscalStatus } = useWMS();
  const [open, setOpen] = useState(false);
  
  const form = useForm<AprovarFormData>({
    resolver: zodResolver(aprovarFormSchema),
    defaultValues: {
      transportadora: '',
      dataExpedicao: ''
    }
  });

  const onSubmit = async (data: AprovarFormData) => {
    try {
      await updateNotaFiscalStatus(nf.id, 'Solicitação Confirmada');
      toast.success(`Carregamento confirmado para NF: ${nf.numeroNF}`);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Erro ao confirmar carregamento:', error);
      toast.error('Erro ao confirmar carregamento');
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
          Confirmar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Confirmar Carregamento
          </DialogTitle>
          <DialogDescription>
            NF: {nf.numeroNF} - Pedido: {nf.numeroPedido}
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
                Confirmar Carregamento
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RecusarDialog({ nf }: { nf: any }) {
  const { updateNotaFiscalStatus } = useWMS();
  const [open, setOpen] = useState(false);
  
  const form = useForm<RecusaFormData>({
    resolver: zodResolver(recusaFormSchema),
    defaultValues: {
      responsavel: '',
      motivo: ''
    }
  });

  const onSubmit = async (data: RecusaFormData) => {
    try {
      // Voltar para Armazenada com observações
      await updateNotaFiscalStatus(nf.id, 'Armazenada', {
        recusaResponsavel: data.responsavel,
        recusaMotivo: data.motivo,
        recusaData: new Date().toISOString()
      });
      toast.success(`Solicitação recusada. Mercadoria voltou para "Armazenadas" com observações.`);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Erro ao recusar solicitação:', error);
      toast.error('Erro ao recusar solicitação');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="w-3 h-3 mr-1" />
          Recusar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-destructive" />
            Recusar Solicitação de Carregamento
          </DialogTitle>
          <DialogDescription>
            NF: {nf.numeroNF} - Pedido: {nf.numeroPedido}
            <br />
            <span className="text-destructive font-medium">
              A mercadoria voltará para "Armazenadas" com as observações da recusa.
            </span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável pela Recusa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Recusa *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o motivo da recusa detalhadamente..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar Recusa
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function TransportadoraSolicitacoesTable() {
  const { notasFiscais } = useWMS();
  
  // Filtrar apenas NFs com solicitação de carregamento (status "Ordem Solicitada")
  const nfsComSolicitacao = notasFiscais.filter(nf => nf.status === 'Ordem Solicitada');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-warning" />
          Solicitações de Carregamento
        </CardTitle>
        <CardDescription>
          Mercadorias com carregamento solicitado pelos clientes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº NF</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfsComSolicitacao.map((nf) => (
                <TableRow key={nf.id}>
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell>{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
                  <TableCell className="font-medium text-primary">{nf.cliente}</TableCell>
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{nf.peso.toFixed(1)}</TableCell>
                  <TableCell>{nf.volume.toFixed(2)}</TableCell>
                  <TableCell>{nf.localizacao}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(nf.status)}>
                      {nf.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      <AprovarDialog nf={nf} />
                      <RecusarDialog nf={nf} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nfsComSolicitacao.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de carregamento pendente</p>
            <p className="text-sm mt-1">As solicitações dos clientes aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}