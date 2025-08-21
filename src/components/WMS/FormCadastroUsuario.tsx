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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clientPasswordManager } from '@/utils/clientPasswordManager';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin_transportadora', 'operador', 'cliente'], {
    required_error: 'Selecione um tipo de usuário',
  }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  transportadoraId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: 'admin_transportadora' | 'operador' | 'cliente';
  transportadoraId?: string;
}

interface FormCadastroUsuarioProps {
  userType?: 'super_admin' | 'admin_transportadora' | 'cliente';
  usuarioToEdit?: Usuario;
  onSuccess?: () => void;
}

export function FormCadastroUsuario({ userType = 'admin_transportadora', usuarioToEdit, onSuccess }: FormCadastroUsuarioProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: usuarioToEdit?.name || '',
      email: usuarioToEdit?.email || '',
      role: usuarioToEdit?.role || (userType === 'cliente' ? 'cliente' : 'operador'),
      senha: '',
      transportadoraId: usuarioToEdit?.transportadoraId || user?.transportadoraId || '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      if (usuarioToEdit) {
        // Editar usuário existente
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: values.name,
            email: values.email,
          })
          .eq('user_id', usuarioToEdit.id);

        if (profileError) {
          console.error('Erro ao atualizar perfil:', profileError);
          toast.error('Erro ao atualizar usuário');
          return;
        }

        // Atualizar role se não for cliente
        if (values.role !== 'cliente') {
          const { error: roleError } = await supabase
            .from('user_transportadoras')
            .update({
              role: values.role as 'admin_transportadora' | 'operador',
            })
            .eq('user_id', usuarioToEdit.id);

          if (roleError) {
            console.error('Erro ao atualizar role:', roleError);
          }
        }

        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar usuário no Supabase Auth se senha foi fornecida
        let authUserId = null;
        if (values.senha) {
          const currentOrigin = window.location.origin;
          const redirectUrl = values.role === 'cliente' 
            ? `${currentOrigin}/cliente`
            : `${currentOrigin}/transportadora`;
          
          console.log(`🔗 URL de redirecionamento para ${values.role}: ${redirectUrl}`);
          
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: values.email,
            password: values.senha,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                name: values.name,
                role: values.role
              }
            }
          });

          if (authError) {
            console.error('Erro ao criar usuário de autenticação:', authError);
            
            // Se usuário já existe, tentar enviar reset
            if (authError.message.includes('User already registered')) {
              console.log('Usuário já existe, enviando reset de senha...');
              
              const resetResult = await clientPasswordManager.resetPassword(values.email);
              if (resetResult.success) {
                toast.success(`Usuário já existia. ${resetResult.message}`);
                authUserId = null; // Não temos o ID, mas o reset foi enviado
              } else {
                toast.error(resetResult.error || 'Erro ao enviar reset de senha');
                throw new Error(resetResult.error || 'Erro ao enviar reset de senha');
              }
            } else {
              throw authError;
            }
          } else {
            authUserId = authData.user?.id;
            console.log('✅ Usuário criado com sucesso na autenticação');
          }
        }

      // Criar perfil do usuário
      if (authUserId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: authUserId,
            name: values.name,
            email: values.email,
          }]);

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }

        // Associar usuário à transportadora (se não for super admin e não for cliente)
        if (userType !== 'super_admin' && values.role !== 'cliente' && (user?.transportadoraId || values.transportadoraId)) {
          const transportadoraId = values.transportadoraId || user?.transportadoraId;
          
          const { error: userTransportadoraError } = await supabase
            .from('user_transportadoras')
            .insert([{
              user_id: authUserId,
              transportadora_id: transportadoraId,
              role: values.role as 'admin_transportadora' | 'operador',
              is_active: true
            }]);

          if (userTransportadoraError) {
            console.error('Erro ao associar usuário à transportadora:', userTransportadoraError);
          }
        }

        // Para clientes, usar a tabela clientes diretamente
        if (values.role === 'cliente' && (user?.transportadoraId || values.transportadoraId)) {
          const transportadoraId = values.transportadoraId || user?.transportadoraId;
          
          const { error: clienteError } = await supabase
            .from('clientes')
            .insert([{
              razao_social: values.name,
              cnpj: '', // Será preenchido depois
              email: values.email,
              transportadora_id: transportadoraId,
            }]);

          if (clienteError) {
            console.error('Erro ao criar cliente:', clienteError);
          }
        }
      }

      // Enviar email de notificação de forma assíncrona (não bloqueante)
      supabase.functions.invoke('send-notification-email', {
        body: {
          to: values.email,
          subject: 'Bem-vindo ao Sistema WMS - Conta Criada',
          type: 'usuario_cadastrado',  
          data: {
            nome: values.name,
            email: values.email,
            senha: values.senha,
            role: values.role
          }
        }
      }).catch(emailError => {
        console.error('Erro ao enviar email de notificação:', emailError);
      });
      
      toast.success('Usuário cadastrado com sucesso!');
    }
    
    form.reset();
    onSuccess?.();
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    toast.error('Erro ao cadastrar usuário');
  } finally {
    setIsLoading(false);
  }
};

  const getRoleOptions = () => {
    switch (userType) {
      case 'super_admin':
        return [
          { value: 'admin_transportadora', label: 'Admin Transportadora' },
          { value: 'operador', label: 'Operador' },
          { value: 'cliente', label: 'Cliente' },
        ];
      case 'admin_transportadora':
        return [
          { value: 'operador', label: 'Operador' },
          { value: 'cliente', label: 'Cliente' },
        ];
      case 'cliente':
        return [
          { value: 'cliente', label: 'Usuário Cliente' },
        ];
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          {usuarioToEdit ? 'Editar Usuário' : 'Cadastro de Usuário'}
        </CardTitle>
        <CardDescription>
          {usuarioToEdit ? 'Atualize os dados do usuário' : 'Cadastre um novo usuário para acessar o sistema'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do usuário" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="usuario@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Usuário</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getRoleOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="senha"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>{usuarioToEdit ? 'Nova Senha (Opcional)' : 'Senha Temporária (Opcional)'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={usuarioToEdit ? "Nova senha para o usuário" : "Senha para o usuário"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {usuarioToEdit 
                        ? 'Deixe em branco para manter a senha atual'
                        : 'Se não informada, o usuário poderá usar "Esqueci minha senha"'
                      }
                    </p>
                  </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              {isLoading 
                ? (usuarioToEdit ? 'Atualizando...' : 'Cadastrando...') 
                : (usuarioToEdit ? 'Atualizar Usuário' : 'Cadastrar Usuário')
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}