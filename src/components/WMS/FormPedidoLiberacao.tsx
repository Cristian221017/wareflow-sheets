import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useWMS } from '@/contexts/WMSContext';
import { PedidoLiberacao } from '@/types/wms';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

const formSchema = z.object({
  numeroPedido: z.string().min(1, 'Número do pedido é obrigatório'),
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

export function FormPedidoLiberacao() {
  const { addPedidoLiberacao, notasFiscais } = useWMS();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroPedido: '',
      dataSolicitacao: '',
      cliente: '',
      cnpjCliente: '',
      nfVinculada: '',
      produto: '',
      quantidade: 0,
      peso: 0,
      volume: 0,
      prioridade: 'Média',
      responsavel: ''
    }
  });

  const onSubmit = (data: FormData) => {
    addPedidoLiberacao(data);
    toast.success('Pedido de liberação criado com sucesso!');
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Solicitar Liberação
        </CardTitle>
        <CardDescription>
          Criar uma nova solicitação de liberação de mercadoria
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                      <Input placeholder="PED001" {...field} />
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
                      <Input placeholder="Nome do cliente" {...field} />
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
                      <Input placeholder="00.000.000/0000-00" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma NF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {notasFiscais
                          .filter(nf => nf.status !== 'Liberada')
                          .map(nf => (
                            <SelectItem key={nf.id} value={nf.numeroNF}>
                              {nf.numeroNF} - {nf.produto}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="Nome do produto" {...field} />
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
                      <Input type="number" placeholder="50" {...field} />
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
                      <Input type="number" step="0.1" placeholder="25.0" {...field} />
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
                      <Input type="number" step="0.01" placeholder="1.2" {...field} />
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

            <div className="flex justify-end">
              <Button type="submit" className="bg-warning text-warning-foreground hover:bg-warning/80">
                Criar Pedido de Liberação
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}