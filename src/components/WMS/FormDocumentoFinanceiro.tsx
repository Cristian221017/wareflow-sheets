import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentoFinanceiroFormData } from '@/types/financeiro';
import { toast } from 'sonner';
import { Receipt, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

const formSchema = z.object({
  numeroCte: z.string().min(1, 'Número do CTE é obrigatório'),
  dataVencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero').optional(),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  observacoes: z.string().optional(),
  status: z.enum(['Em aberto', 'Pago', 'Vencido']).optional(),
  dataPagamento: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface FormDocumentoFinanceiroProps {
  onSuccess?: () => void;
}

export function FormDocumentoFinanceiro({ onSuccess }: FormDocumentoFinanceiroProps) {
  const { addDocumentoFinanceiro, uploadArquivo } = useFinanceiro();
  const { clientes } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [cteFile, setCteFile] = useState<File | null>(null);
  const boletoInputRef = useRef<HTMLInputElement>(null);
  const cteInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroCte: '',
      dataVencimento: '',
      valor: undefined,
      clienteId: '',
      observacoes: '',
      status: 'Em aberto',
      dataPagamento: ''
    }
  });

  // Watch for status changes to control date field
  const statusValue = form.watch('status');

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      
      // Create the document first
      const newDocumento = await addDocumentoFinanceiro(data as DocumentoFinanceiroFormData);
      
      // Upload files if they exist and we have a document ID
      if (newDocumento?.id && (boletoFile || cteFile)) {
        const numeroCte = data.numeroCte;
        console.log('📄 Documento criado, iniciando uploads:', { 
          documentoId: newDocumento.id, 
          hasBoletoFile: !!boletoFile, 
          hasCteFile: !!cteFile,
          numeroCte 
        });
        
        if (boletoFile) {
          console.log('📤 Fazendo upload do boleto...');
          await uploadArquivo(newDocumento.id, { file: boletoFile, type: 'boleto', numeroCte });
        }
        
        if (cteFile) {
          console.log('📤 Fazendo upload do CTE...');
          await uploadArquivo(newDocumento.id, { file: cteFile, type: 'cte', numeroCte });
        }
      }
      
      toast.success('Documento financeiro cadastrado com sucesso!');
      form.reset();
      setBoletoFile(null);
      setCteFile(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao cadastrar documento financeiro:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar documento financeiro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File, type: 'boleto' | 'cte') => {
    if (type === 'boleto') {
      setBoletoFile(file);
      toast.success('Boleto selecionado para anexar');
    } else {
      setCteFile(file);
      toast.success('CTE selecionado para anexar');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Registrar Documento Financeiro
        </CardTitle>
        <CardDescription>
          Cadastre um novo CTE e seus documentos financeiros associados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="numeroCte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do CTE *</FormLabel>
                    <FormControl>
                      <Input placeholder="CTE-123456" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataVencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="1500.00" 
                        {...field} 
                      />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Em aberto">Em aberto</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataPagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        disabled={statusValue !== 'Pago'}
                        placeholder={statusValue !== 'Pago' ? 'Disponível apenas para status "Pago"' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais sobre o documento financeiro..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload de Arquivos */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Anexar Documentos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Boleto</label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={boletoInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file, 'boleto');
                      }}
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => boletoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {boletoFile ? boletoFile.name : 'Anexar Boleto'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, PNG (max 10MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">CTE</label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={cteInputRef}
                      type="file"
                      accept=".pdf,.xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file, 'cte');
                      }}
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cteInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {cteFile ? cteFile.name : 'Anexar CTE'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, XML (max 10MB)
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Os arquivos serão anexados após o documento ser cadastrado
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full sm:w-auto bg-success text-success-foreground hover:bg-success/80"
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar Documento'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}