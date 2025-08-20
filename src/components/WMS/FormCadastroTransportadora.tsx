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
import { Building2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  razaoSocial: z.string().min(1, 'Razão social é obrigatória'),
  email: z.string().email('Email inválido'),
  cnpj: z.string().min(14, 'CNPJ é obrigatório'),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  nomeFantasia: z.string().optional(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function FormCadastroTransportadora() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      razaoSocial: '',
      email: '',
      cnpj: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      nomeFantasia: '',
      senha: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Criar usuário no Supabase Auth se senha foi fornecida
      let authUserId = null;
      if (values.senha) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: values.email,
          password: values.senha,
          options: {
            emailRedirectTo: `${window.location.origin}/transportadora`
          }
        });

        if (authError) {
          console.error('Erro ao criar usuário de autenticação:', authError);
        } else {
          authUserId = authData.user?.id;
        }
      }

      // Inserir transportadora
      const { data: transportadoraData, error: transportadoraError } = await supabase
        .from('transportadoras')
        .insert([{
          razao_social: values.razaoSocial,
          cnpj: values.cnpj,
          email: values.email,
          telefone: values.telefone,
          endereco: values.endereco,
          cidade: values.cidade,
          estado: values.estado,
          cep: values.cep,
          nome_fantasia: values.nomeFantasia,
        }])
        .select()
        .single();

      if (transportadoraError) {
        throw transportadoraError;
      }

      // Se criou usuário de auth, associar à transportadora como admin
      if (authUserId && transportadoraData) {
        const { error: userTransportadoraError } = await supabase
          .from('user_transportadoras')
          .insert([{
            user_id: authUserId,
            transportadora_id: transportadoraData.id,
            role: 'admin_transportadora',
            is_active: true
          }]);

        if (userTransportadoraError) {
          console.error('Erro ao associar usuário à transportadora:', userTransportadoraError);
        }
      }

      // Enviar email de notificação
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: values.email,
            subject: 'Bem-vindo ao Sistema WMS - Transportadora Cadastrada',
            type: 'transportadora_cadastrada',
            data: {
              nome: values.razaoSocial,
              email: values.email,
              senha: values.senha
            }
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de notificação:', emailError);
        // Não falha o cadastro se o email falhar
      }
      
      toast.success('Transportadora cadastrada com sucesso!');
      form.reset();
    } catch (error) {
      console.error('Erro ao cadastrar transportadora:', error);
      toast.error('Erro ao cadastrar transportadora');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Cadastro de Transportadora
        </CardTitle>
        <CardDescription>
          Cadastre uma nova transportadora no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="razaoSocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Razão social da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomeFantasia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome fantasia" {...field} />
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
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Número, Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Acesso ao Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Acesso</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@transportadora.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha Temporária (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Senha para a transportadora" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Se não informada, o usuário poderá usar "Esqueci minha senha" para criar uma
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {isLoading ? 'Cadastrando...' : 'Cadastrar Transportadora'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}