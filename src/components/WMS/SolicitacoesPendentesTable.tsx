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
import { log, warn, error as logError } from '@/utils/logger';
import { useNFs, useFluxoMutations } from '@/hooks/useNFs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  transportadora: z.string().min(1, 'Transportadora é obrigatória'),
  dataExpedicao: z.string().optional()
});

const recusaFormSchema = z.object({
  responsavel: z.string().min(1, 'Responsável é obrigatório'),
  motivo: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres')
});

type FormData = z.infer<typeof formSchema>;
type RecusaFormData = z.infer<typeof recusaFormSchema>;

function AprovarDialog({ nfId, numeroNf, numeroPedido }: { nfId: string, numeroNf: string, numeroPedido: string }) {
  const { confirmar } = useFluxoMutations();
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
      await confirmar.mutateAsync(nfId);
      setOpen(false);
      form.reset();
    } catch (error) {
      logError('Erro ao aprovar solicitação:', error);
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
            Pedido: {numeroPedido} - NF: {numeroNf}
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

function RecusarDialog({ nfId, numeroNf, numeroPedido }: { nfId: string, numeroNf: string, numeroPedido: string }) {
  const { recusar } = useFluxoMutations();
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
      await recusar.mutateAsync(nfId);
      setOpen(false);
      form.reset();
    } catch (error) {
      logError('Erro ao recusar solicitação:', error);
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
            Pedido: {numeroPedido} - NF: {numeroNf}
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

export function SolicitacoesPendentesTable() {
  const { data: solicitadas, isLoading } = useNFs("SOLICITADA");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Carregando solicitações...</p>
        </CardContent>
      </Card>
    );
  }

  const validSolicitadas = solicitadas || [];

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
                <TableHead>Número NF</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validSolicitadas.map((nf) => (
                <TableRow key={nf.id}>
                  <TableCell className="font-medium">{nf.numero_nf}</TableCell>
                  <TableCell>{nf.numero_pedido}</TableCell>
                  <TableCell>{nf.ordem_compra}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{Number(nf.peso).toFixed(1)}</TableCell>
                  <TableCell>{Number(nf.volume).toFixed(2)}</TableCell>
                  <TableCell>{new Date(nf.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      <AprovarDialog 
                        nfId={nf.id} 
                        numeroNf={nf.numero_nf} 
                        numeroPedido={nf.numero_pedido} 
                      />
                      <RecusarDialog 
                        nfId={nf.id} 
                        numeroNf={nf.numero_nf} 
                        numeroPedido={nf.numero_pedido} 
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {validSolicitadas.length === 0 && (
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