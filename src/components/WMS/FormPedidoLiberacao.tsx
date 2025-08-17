import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { PedidoLiberacao, NotaFiscal } from '@/types/wms';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { useEffect } from 'react';

interface FormPedidoLiberacaoProps {
  notaFiscal?: NotaFiscal;
  onSuccess?: () => void;
}

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

export function FormPedidoLiberacao({ notaFiscal, onSuccess }: FormPedidoLiberacaoProps = {}) {
  console.log('FormPedidoLiberacao - notaFiscal recebida:', notaFiscal);
  const { addPedidoLiberacao, notasFiscais } = useWMS();
  const { user } = useAuth();
  
  // Prepare NF options for combobox
  const nfOptions = notasFiscais
    .filter(nf => nf.status !== 'Solicitação Confirmada')
    .map(nf => ({
      value: nf.numeroNF,
      label: `${nf.numeroNF} - ${nf.produto} (${nf.cliente})`
    }));

  // Generate today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroPedido: notaFiscal?.numeroPedido || '',
      ordemCompra: notaFiscal?.ordemCompra || '',
      dataSolicitacao: today,
      cliente: notaFiscal?.cliente || user?.name || '',
      cnpjCliente: notaFiscal?.cnpjCliente || user?.cnpj || '',
      nfVinculada: notaFiscal?.numeroNF || '',
      produto: notaFiscal?.produto || '',
      quantidade: notaFiscal?.quantidade || 0,
      peso: notaFiscal?.peso || 0,
      volume: notaFiscal?.volume || 0,
      prioridade: 'Média',
      responsavel: ''
    }
  });

  // Update form when notaFiscal prop changes
  useEffect(() => {
    if (notaFiscal) {
      form.reset({
        numeroPedido: notaFiscal.numeroPedido,
        ordemCompra: notaFiscal.ordemCompra,
        dataSolicitacao: today,
        cliente: notaFiscal.cliente,
        cnpjCliente: notaFiscal.cnpjCliente,
        nfVinculada: notaFiscal.numeroNF,
        produto: notaFiscal.produto,
        quantidade: notaFiscal.quantidade,
        peso: notaFiscal.peso,
        volume: notaFiscal.volume,
        prioridade: 'Média',
        responsavel: ''
      });
    }
  }, [notaFiscal, form, today]);

  const onSubmit = (data: FormData) => {
    const pedidoData = data as unknown as Omit<PedidoLiberacao, 'id' | 'createdAt' | 'status'>;
    addPedidoLiberacao(pedidoData);
    toast.success('Ordem de carregamento criada com sucesso!');
    
    if (onSuccess) {
      onSuccess();
    } else {
      form.reset();
    }
  };

  const isPreFilled = !!notaFiscal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {isPreFilled ? 'Confirmar Ordem de Carregamento' : 'Solicitar Carregamento'}
        </CardTitle>
        <CardDescription>
          {isPreFilled 
            ? `Confirme os dados da NF ${notaFiscal?.numeroNF} e informe o responsável pela solicitação`
            : 'Criar uma nova ordem de carregamento de mercadoria'
          }
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
                      <Input placeholder="PED001" {...field} readOnly={isPreFilled} />
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
                      <Input placeholder="OC-ABC-001" {...field} readOnly={isPreFilled} />
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
                      <Input type="date" {...field} readOnly={isPreFilled} />
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
                      <Input placeholder="Nome do cliente" {...field} readOnly={isPreFilled} />
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
                      <Input placeholder="00.000.000/0000-00" {...field} readOnly={isPreFilled} />
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
                      {isPreFilled ? (
                        <Input 
                          value={field.value} 
                          readOnly 
                          className="bg-muted"
                        />
                      ) : (
                        <Combobox
                          options={nfOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione uma NF"
                          searchPlaceholder="Buscar NF..."
                          emptyText="Nenhuma NF encontrada"
                          className="w-full"
                        />
                      )}
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
                      <Input placeholder="Nome do produto" {...field} readOnly={isPreFilled} />
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
                      <Input type="number" placeholder="50" {...field} readOnly={isPreFilled} />
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
                      <Input type="number" step="0.1" placeholder="25.0" {...field} readOnly={isPreFilled} />
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
                      <Input type="number" step="0.01" placeholder="1.2" {...field} readOnly={isPreFilled} />
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
                  <FormItem className={isPreFilled ? "border border-warning rounded-lg p-3 bg-warning/5" : ""}>
                    <FormLabel className={isPreFilled ? "text-warning font-semibold" : ""}>
                      Responsável pela Liberação * {isPreFilled && "(Campo obrigatório)"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome do responsável" 
                        {...field} 
                        className={isPreFilled ? "border-warning focus:border-warning focus:ring-warning" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-warning text-warning-foreground hover:bg-warning/80">
                {isPreFilled ? 'Confirmar Ordem' : 'Criar Ordem de Carregamento'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}