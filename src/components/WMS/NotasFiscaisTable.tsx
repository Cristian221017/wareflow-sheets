import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWMS } from '@/contexts/WMSContext';
import { NotaFiscal, PedidoLiberacao } from '@/types/wms';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Send } from 'lucide-react';

const getStatusColor = (status: NotaFiscal['status']) => {
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

const isOverdue = (dataRecebimento: string, prazoMaximo: number = 30) => {
  const receiptDate = new Date(dataRecebimento);
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > prazoMaximo;
};

const formSchema = z.object({
  numeroPedido: z.string().min(1, 'Número do pedido é obrigatório'),
  ordemCompra: z.string().min(1, 'Ordem de compra é obrigatória'),
  dataSolicitacao: z.string().min(1, 'Data de solicitação é obrigatória'),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  cnpjCliente: z.string().min(14, 'CNPJ deve ter pelo menos 14 caracteres'),
  nfVinculada: z.string().min(1, 'NF vinculada é obrigatória'),
  produto: z.string().min(1, 'Produto é obrigatório'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  peso: z.coerce.number().min(0.1, 'Peso deve ser maior que 0'),
  volume: z.coerce.number().min(0.01, 'Volume deve ser maior que 0'),
  prioridade: z.enum(['Alta', 'Média', 'Baixa']),
  responsavel: z.string().min(1, 'Responsável é obrigatório')
});

type FormData = z.infer<typeof formSchema>;

function SolicitarLiberacaoDialog({ notaFiscal }: { notaFiscal: NotaFiscal }) {
  const { addPedidoLiberacao } = useWMS();
  const [open, setOpen] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroPedido: notaFiscal.numeroPedido,
      ordemCompra: notaFiscal.ordemCompra,
      dataSolicitacao: new Date().toISOString().split('T')[0],
      cliente: notaFiscal.cliente,
      cnpjCliente: notaFiscal.cnpjCliente,
      nfVinculada: notaFiscal.numeroNF,
      produto: notaFiscal.produto,
      quantidade: notaFiscal.quantidade,
      peso: notaFiscal.peso,
      volume: notaFiscal.volume,
      prioridade: 'Média' as const,
      responsavel: ''
    }
  });

  const onSubmit = (data: FormData) => {
    const pedidoData = data as unknown as Omit<PedidoLiberacao, 'id' | 'createdAt' | 'status'>;
    addPedidoLiberacao(pedidoData);
    toast.success('Pedido de liberação criado com sucesso!');
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={notaFiscal.status === 'Liberada'}
          className="gap-1"
        >
          <Send className="w-3 h-3" />
          Solicitar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Solicitar Liberação - NF {notaFiscal.numeroNF}
          </DialogTitle>
          <DialogDescription>
            Criar uma solicitação de liberação para esta nota fiscal
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="numeroPedido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Pedido *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordemCompra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Compra *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataSolicitacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Solicitação *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpjCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ do Cliente *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nfVinculada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NF Vinculada *</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="peso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume (m³) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável pela Liberação *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do responsável" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-warning text-warning-foreground hover:bg-warning/80">
                Criar Pedido de Liberação
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function NotasFiscaisTable() {
  const { notasFiscais } = useWMS();
  const [selectedCliente, setSelectedCliente] = useState<string>('todos');

  // Get unique clients for filter
  const clienteOptions = useMemo(() => {
    const uniqueClientes = Array.from(new Set(notasFiscais.map(nf => nf.cliente)));
    return [
      { value: 'todos', label: 'Todos os clientes' },
      ...uniqueClientes.map(cliente => ({ value: cliente, label: cliente }))
    ];
  }, [notasFiscais]);

  // Filter notes by selected client
  const filteredNFs = useMemo(() => {
    if (selectedCliente === 'todos') {
      return notasFiscais;
    }
    return notasFiscais.filter(nf => nf.cliente === selectedCliente);
  }, [notasFiscais, selectedCliente]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas Fiscais Armazenadas</CardTitle>
        <CardDescription>
          Controle de todas as notas fiscais no armazém
        </CardDescription>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar por cliente:</span>
            <Combobox
              options={clienteOptions}
              value={selectedCliente}
              onValueChange={setSelectedCliente}
              placeholder="Selecione um cliente"
              searchPlaceholder="Buscar cliente..."
              className="w-48"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número NF</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>CNPJ Fornecedor</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNFs.map((nf) => (
                <TableRow 
                  key={nf.id}
                  className={cn(
                    isOverdue(nf.dataRecebimento) && nf.status === 'Armazenada' 
                      ? 'bg-destructive/10 hover:bg-destructive/20' 
                      : '',
                    nf.status === 'Em Separação' 
                      ? 'bg-warning/10 hover:bg-warning/20' 
                      : ''
                  )}
                >
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell className="text-primary font-medium">{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.cnpj}</TableCell>
                  <TableCell className="font-medium text-primary">{nf.cliente}</TableCell>
                  <TableCell>{nf.cnpjCliente}</TableCell>
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
                  <TableCell>
                    <SolicitarLiberacaoDialog notaFiscal={nf} />
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