import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { NotaFiscal } from '@/types/wms';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

const formSchema = z.object({
  numeroNF: z.string().min(1, 'Número da NF é obrigatório'),
  numeroPedido: z.string().min(1, 'Número do pedido é obrigatório'),
  ordemCompra: z.string().min(1, 'Ordem de compra é obrigatória'),
  dataRecebimento: z.string().min(1, 'Data de recebimento é obrigatória'),
  fornecedor: z.string().min(1, 'Fornecedor é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ deve ter pelo menos 14 caracteres'),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  produto: z.string().min(1, 'Produto é obrigatório'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  peso: z.coerce.number().min(0.1, 'Peso deve ser maior que 0'),
  volume: z.coerce.number().min(0.01, 'Volume deve ser maior que 0'),
  localizacao: z.string().min(1, 'Localização é obrigatória'),
  status: z.enum(['ARMAZENADA', 'SOLICITADA', 'CONFIRMADA']).default('ARMAZENADA')
});

type FormData = z.infer<typeof formSchema>;

export function FormNotaFiscal() {
  const { addNotaFiscal } = useWMS();
  const { clientes } = useAuth();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroNF: '',
      numeroPedido: '',
      ordemCompra: '',
      dataRecebimento: '',
      fornecedor: '',
      cnpj: '',
      clienteId: '',
      produto: '',
      quantidade: 0,
      peso: 0,
      volume: 0,
      localizacao: '',
      status: 'ARMAZENADA' as const
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      const selectedCliente = clientes.find(c => c.id === data.clienteId);
      if (!selectedCliente) {
        toast.error('Cliente não encontrado');
        return;
      }

      const nfData = {
        numeroNF: data.numeroNF,
        numeroPedido: data.numeroPedido,
        ordemCompra: data.ordemCompra,
        dataRecebimento: data.dataRecebimento,
        fornecedor: data.fornecedor,
        cnpj: data.cnpj,
        clienteId: data.clienteId, // Pass the client ID directly
        cliente: selectedCliente.name, // Keep for compatibility 
        cnpjCliente: selectedCliente.cnpj || '',
        produto: data.produto,
        quantidade: data.quantidade,
        peso: data.peso,
        volume: data.volume,
        localizacao: data.localizacao,
        status: 'ARMAZENADA' as const
      };

      await addNotaFiscal(nfData as Omit<NotaFiscal, 'id' | 'createdAt'>);
      toast.success('Nota Fiscal cadastrada com sucesso!');
      form.reset();
    } catch (error) {
      console.error('Erro ao cadastrar NF:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar Nota Fiscal');
    }
  };

  // Watch for client selection to auto-populate CNPJ
  const selectedClienteId = form.watch('clienteId');
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Registrar Nova Nota Fiscal
        </CardTitle>
        <CardDescription>
          Adicione uma nova nota fiscal ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="numeroNF"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número NF *</FormLabel>
                    <FormControl>
                      <Input placeholder="NF123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numeroPedido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Pedido *</FormLabel>
                    <FormControl>
                      <Input placeholder="PED-2024-001" {...field} />
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
                      <Input placeholder="OC-ABC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataRecebimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Recebimento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fornecedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do fornecedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.name} - {cliente.cnpj}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCliente && (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  Cliente selecionado: {selectedCliente.name} | CNPJ: {selectedCliente.cnpj}
                </div>
              )}

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
                      <Input type="number" placeholder="100" {...field} />
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
                      <Input type="number" step="0.1" placeholder="25.5" {...field} />
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
                      <Input type="number" step="0.01" placeholder="1.25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localizacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização no Armazém *</FormLabel>
                    <FormControl>
                      <Input placeholder="A1-B2-C3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ARMAZENADA">Armazenada</SelectItem>
                        <SelectItem value="SOLICITADA">Solicitada</SelectItem>
                        <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto bg-success text-success-foreground hover:bg-success/80">
                Cadastrar Nota Fiscal
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}