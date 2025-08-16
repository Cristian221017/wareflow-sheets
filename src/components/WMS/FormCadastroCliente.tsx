import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  cnpj: z.string().min(14, 'CNPJ é obrigatório'),
  emailNotaFiscal: z.string().email('Email inválido').optional().or(z.literal('')),
  emailSolicitacaoLiberacao: z.string().email('Email inválido').optional().or(z.literal('')),
  emailLiberacaoAutorizada: z.string().email('Email inválido').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function FormCadastroCliente() {
  const { addCliente } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      cnpj: '',
      emailNotaFiscal: '',
      emailSolicitacaoLiberacao: '',
      emailLiberacaoAutorizada: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await addCliente({
        name: values.name,
        email: values.email,
        cnpj: values.cnpj,
        emailNotaFiscal: values.emailNotaFiscal || undefined,
        emailSolicitacaoLiberacao: values.emailSolicitacaoLiberacao || undefined,
        emailLiberacaoAutorizada: values.emailLiberacaoAutorizada || undefined,
      });
      
      toast.success('Cliente cadastrado com sucesso!');
      form.reset();
    } catch (error) {
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Cadastro de Cliente
        </CardTitle>
        <CardDescription>
          Cadastre um novo cliente no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
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
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Acesso</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emails de Notificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="emailNotaFiscal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email para NF Cadastrada (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="nf@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber quando uma NF for cadastrada
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailSolicitacaoLiberacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email para Solicitação de Liberação (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="solicitacao@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber solicitações de liberação
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailLiberacaoAutorizada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email para Liberação Autorizada (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="liberacao@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber quando pedidos forem liberados
                    </p>
                  </FormItem>
                )}
               />
              </div>
             </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              <User className="w-4 h-4 mr-2" />
              {isLoading ? 'Cadastrando...' : 'Cadastrar Cliente'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}