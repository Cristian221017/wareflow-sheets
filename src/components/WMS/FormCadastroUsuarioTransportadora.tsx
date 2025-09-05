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
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Crown, Shield, User, UserPlus as UserAdd, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
  setor: z.string().min(1, 'Setor é obrigatório'),
  role: z.enum(['operador', 'admin_transportadora', 'super_admin'], {
    required_error: 'Selecione um nível de permissão',
  }),
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

interface FormCadastroUsuarioTransportadoraProps {
  onSuccess?: () => void;
}

export function FormCadastroUsuarioTransportadora({ onSuccess }: FormCadastroUsuarioTransportadoraProps) {
  const { user } = useAuth();
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
      role: 'operador',
      permissions: {
        users: {
          create: false,
          edit: false,
          delete: false,
        }
      }
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user?.transportadoraId) {
      toast.error('Erro: transportadora não identificada');
      return;
    }

    // Verificar se usuário atual pode criar o role solicitado
    if (values.role === 'super_admin' && user.role !== 'super_admin') {
      toast.error('Apenas Super Admins podem criar outros Super Admins');
      return;
    }

    if (values.role === 'admin_transportadora' && !['super_admin', 'admin_transportadora'].includes(user.role)) {
      toast.error('Você não tem permissão para criar Administradores');
      return;
    }

    setIsLoading(true);

    try {
      // Garantir que as permissões tenham uma estrutura válida
      const validPermissions = {
        users: {
          create: values.permissions?.users?.create === true,
          edit: values.permissions?.users?.edit === true,
          delete: values.permissions?.users?.delete === true,
        }
      };

      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/transportadora`,
          data: {
            name: values.name,
            role: values.role
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

      // 2. Criar profile
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

      // 3. Criar relação user_transportadoras
      const { error: relationError } = await supabase
        .from('user_transportadoras')
        .insert([{
          user_id: authData.user.id,
          transportadora_id: user.transportadoraId,
          role: values.role,
          is_active: true
        }]);

      if (relationError) {
        console.error('Error creating user relation:', relationError);
        toast.error('Erro ao vincular usuário à transportadora');
        return;
      }

      toast.success(`Usuário ${values.role === 'super_admin' ? 'Super Admin' : values.role === 'admin_transportadora' ? 'Administrador' : 'Operador'} criado com sucesso!`);
      form.reset();
      onSuccess?.();

    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro inesperado ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin_transportadora':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'operador':
        return <User className="w-4 h-4 text-green-600" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin_transportadora':
        return 'Administrador';
      case 'operador':
        return 'Operador';
      default:
        return role;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Cadastrar Novo Usuário da Transportadora
        </CardTitle>
        <CardDescription>
          Cadastre um novo usuário para operar o sistema
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

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Permissão *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível de permissão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="operador">
                        <div className="flex items-center gap-2">
                          {getRoleIcon('operador')}
                          <span>{getRoleLabel('operador')} - Acesso básico às operações</span>
                        </div>
                      </SelectItem>
                      {(['super_admin', 'admin_transportadora'].includes(user?.role || '')) && (
                        <SelectItem value="admin_transportadora">
                          <div className="flex items-center gap-2">
                            {getRoleIcon('admin_transportadora')}
                            <span>{getRoleLabel('admin_transportadora')} - Gerencia toda a transportadora</span>
                          </div>
                        </SelectItem>
                      )}
                      {user?.role === 'super_admin' && (
                        <SelectItem value="super_admin">
                          <div className="flex items-center gap-2">
                            {getRoleIcon('super_admin')}
                            <span>{getRoleLabel('super_admin')} - Acesso total ao sistema</span>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Seção de Permissões Granulares */}
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">Permissões Específicas</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Defina quais ações este usuário poderá realizar além do seu nível de acesso básico
                </p>
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