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
  emailRastreabilidade: z.string().email('Email de rastreabilidade inválido').optional().or(z.literal('')),
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
      emailRastreabilidade: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await addCliente({
        name: values.name,
        email: values.email,
        cnpj: values.cnpj,
        emailRastreabilidade: values.emailRastreabilidade || undefined,
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

              <FormField
                control={form.control}
                name="emailRastreabilidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Rastreabilidade (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="rastreamento@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber notificações sobre NFs e liberações
                    </p>
                  </FormItem>
                )}
              />
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