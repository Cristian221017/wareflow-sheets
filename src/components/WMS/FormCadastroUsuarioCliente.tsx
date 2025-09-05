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
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, UserPlus as UserAdd, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { log, warn, error as logError } from '@/utils/logger';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
  setor: z.string().min(1, 'Setor é obrigatório'),
  permissions: z.object({
    users: z.object({
      create: z.boolean().default(false),
      edit: z.boolean().default(false),
      delete: z.boolean().default(false),
    })
  }).default({
    users: {
      create: false,
      edit: false,
      delete: false,
    }
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

interface FormCadastroUsuarioClienteProps {
  onSuccess?: () => void;
}

export function FormCadastroUsuarioCliente({ onSuccess }: FormCadastroUsuarioClienteProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      cpf: '',
      password: '',
      confirmPassword: '',
      setor: '',
      permissions: {
        users: {
          create: true,  // Default true para clientes cadastrados pela transportadora
          edit: true,    // Default true para clientes cadastrados pela transportadora
          delete: true,  // Default true para clientes cadastrados pela transportadora
        }
      }
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Garantir que as permissões tenham uma estrutura válida
      // Clientes cadastrados pela transportadora são sempre admin
      const validPermissions = {
        users: {
          create: values.permissions?.users?.create !== false, // Default true para clientes
          edit: values.permissions?.users?.edit !== false,     // Default true para clientes
          delete: values.permissions?.users?.delete !== false, // Default true para clientes
        }
      };

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/cliente`,
          data: {
            name: values.name,
            role: 'cliente'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          toast.error('Usuário já possui conta no sistema');
        } else {
          toast.error('Erro ao criar usuário: ' + authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário');
        return;
      }

      // Criar profile (será criado pelo trigger, mas garantir que existe)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          user_id: authData.user.id,
          name: values.name,
          email: values.email,
          cpf: values.cpf,
          setor: values.setor,
          permissions: validPermissions
        }]);

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
      }

      toast.success('Usuário criado com sucesso! Pode fazer login imediatamente.');
      form.reset();
      onSuccess?.();
    } catch (error) {
      logError('Erro ao criar usuário:', error);
      toast.error('Erro inesperado ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Cadastrar Novo Usuário
        </CardTitle>
        <CardDescription>
          Cadastre um novo usuário para acessar o sistema
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
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do usuário" {...field} />
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" maxLength={14} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Logística, Comercial, Financeiro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirme a senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção de Permissões */}
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">Permissões de Usuário</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="permissions.users.create"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-2">
                            <UserAdd className="w-4 h-4 text-green-600" />
                            Criar Usuários
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Permite cadastrar novos usuários
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permissions.users.edit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-2">
                            <Edit className="w-4 h-4 text-blue-600" />
                            Editar Usuários
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Permite editar dados dos usuários
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permissions.users.delete"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-destructive" />
                            Excluir Usuários
                          </FormLabel>
                           <p className="text-xs text-muted-foreground">
                             Permite remover usuários do sistema
                           </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Nota:</strong> Clientes cadastrados pela transportadora têm permissões de admin por padrão. 
                    Você pode desmarcar as opções acima para criar usuários com acesso limitado.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              {isLoading ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}