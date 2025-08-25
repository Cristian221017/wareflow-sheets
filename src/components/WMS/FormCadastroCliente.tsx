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
import { supabase } from '@/integrations/supabase/client';
import { clientPasswordManager } from '@/utils/clientPasswordManager';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  cnpj: z.string().min(14, 'CNPJ é obrigatório'),
  emailNotaFiscal: z.string().email('Email inválido').optional().or(z.literal('')),
  emailSolicitacaoLiberacao: z.string().email('Email inválido').optional().or(z.literal('')),
  emailLiberacaoAutorizada: z.string().email('Email inválido').optional().or(z.literal('')),
  emailNotificacaoBoleto: z.string().email('Email inválido').optional().or(z.literal('')),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface Cliente {
  id: string;
  name: string;
  email: string;
  cnpj: string;
  emailNotaFiscal?: string;
  emailSolicitacaoLiberacao?: string;
  emailLiberacaoAutorizada?: string;
  emailNotificacaoBoleto?: string;
}

interface FormCadastroClienteProps {
  clienteToEdit?: Cliente;
  onSuccess?: () => void;
  isClientPortal?: boolean; // Para identificar se está sendo usado no portal do cliente
}

export function FormCadastroCliente({ clienteToEdit, onSuccess, isClientPortal = false }: FormCadastroClienteProps) {
  const { addCliente } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: clienteToEdit?.name || '',
      email: clienteToEdit?.email || '',
      cnpj: clienteToEdit?.cnpj || '',
      emailNotaFiscal: clienteToEdit?.emailNotaFiscal || '',
      emailSolicitacaoLiberacao: clienteToEdit?.emailSolicitacaoLiberacao || '',
      emailLiberacaoAutorizada: clienteToEdit?.emailLiberacaoAutorizada || '',
      emailNotificacaoBoleto: clienteToEdit?.emailNotificacaoBoleto || '',
      senha: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      if (clienteToEdit) {
        // Editar cliente existente
        await updateCliente(clienteToEdit.id, {
          name: values.name,
          email: values.email,
          cnpj: values.cnpj,
          emailNotaFiscal: values.emailNotaFiscal || undefined,
          emailSolicitacaoLiberacao: values.emailSolicitacaoLiberacao || undefined,
          emailLiberacaoAutorizada: values.emailLiberacaoAutorizada || undefined,
          emailNotificacaoBoleto: values.emailNotificacaoBoleto || undefined,
          senha: values.senha || undefined,
        });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente e capturar o ID retornado
        const novoCliente = await addCliente({
          name: values.name,
          email: values.email,
          cnpj: values.cnpj,
          emailNotaFiscal: values.emailNotaFiscal || undefined,
          emailSolicitacaoLiberacao: values.emailSolicitacaoLiberacao || undefined,
          emailLiberacaoAutorizada: values.emailLiberacaoAutorizada || undefined,
          emailNotificacaoBoleto: values.emailNotificacaoBoleto || undefined,
          senha: values.senha || undefined,
        });

        // A) Vincular user_clientes no fluxo do formulário
        if (novoCliente?.id) {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', values.email)
            .maybeSingle();

          if (!profErr && prof?.user_id) {
            // Usar upsert para evitar erro de duplicidade
            const { error: linkErr } = await supabase
              .from('user_clientes' as any)
              .upsert(
                { user_id: prof.user_id, cliente_id: novoCliente.id }, 
                { onConflict: 'user_id,cliente_id', ignoreDuplicates: true }
              );
            if (linkErr) {
              console.warn('Falha ao vincular user↔cliente', linkErr);
            } else {
              console.log('✅ Vínculo user↔cliente criado com sucesso');
            }
          }
        }

        toast.success('Cliente cadastrado com sucesso!');
      }
      
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(`Erro ao ${clienteToEdit ? 'atualizar' : 'cadastrar'} cliente`);
    } finally {
      setIsLoading(false);
    }
  };

  const { user } = useAuth();

  const updateCliente = async (id: string, cliente: any) => {
    if (!user?.transportadoraId) throw new Error('Transportadora não encontrada');
    
    // Atualizar dados do cliente na tabela clientes
    const { error } = await supabase
      .from('clientes')
      .update({
        razao_social: cliente.name,
        email: cliente.email,
        cnpj: cliente.cnpj,
        email_nota_fiscal: cliente.emailNotaFiscal,
        email_solicitacao_liberacao: cliente.emailSolicitacaoLiberacao,
        email_liberacao_autorizada: cliente.emailLiberacaoAutorizada,
        email_notificacao_boleto: cliente.emailNotificacaoBoleto,
      })
      .eq('id', id);
    
    if (error) throw error;

    // Se uma nova senha foi fornecida, criar/atualizar autenticação
    if (cliente.senha) {
      try {
        const authResult = await clientPasswordManager.createClientAccount(
          cliente.email, 
          cliente.senha, 
          cliente.name
        );
        
        if (!authResult.success && 'error' in authResult) {
          console.warn('Aviso na autenticação:', authResult.error);
          toast.warning(`Cliente atualizado, mas houve um problema com a autenticação: ${authResult.error}`);
        } else if (authResult.success && 'message' in authResult) {
          toast.success(authResult.message);
        }
      } catch (authError) {
        console.error('Erro ao criar/atualizar autenticação:', authError);
        toast.warning('Cliente atualizado, mas houve erro na autenticação');
      }
    }

    // A) Vincular user_clientes no fluxo de edição após atualização
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', cliente.email)
      .maybeSingle();

    if (!profErr && prof?.user_id) {
      // Usar upsert para evitar erro de duplicidade
      const { error: linkErr } = await supabase
        .from('user_clientes' as any)
        .upsert(
          { user_id: prof.user_id, cliente_id: id }, 
          { onConflict: 'user_id,cliente_id', ignoreDuplicates: true }
        );
      if (linkErr) {
        console.warn('Falha ao vincular user↔cliente', linkErr);
      } else {
        console.log('✅ Vínculo user↔cliente atualizado com sucesso');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          {clienteToEdit ? 'Editar Cliente' : 'Cadastro de Cliente'}
        </CardTitle>
        <CardDescription>
          {clienteToEdit 
            ? 'Atualize os dados do cliente' 
            : isClientPortal 
              ? 'Cadastre um novo cliente para acessar o sistema'
              : 'Cadastre um novo cliente para ser controlado pela transportadora'
          }
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
                    <FormLabel>Email para Ordem de Carregamento (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="solicitacao@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber ordens de carregamento
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailLiberacaoAutorizada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email para Confirmação Autorizada (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="liberacao@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber quando pedidos forem confirmados
                    </p>
                  </FormItem>
                )}
               />

               <FormField
                control={form.control}
                name="emailNotificacaoBoleto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email para Notificação de Boleto (Opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="boleto@empresa.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Email para receber quando novos boletos forem cadastrados
                    </p>
                  </FormItem>
                )}
               />
               </div>

               <div className="space-y-4">
                 <h3 className="text-lg font-medium">Acesso ao Sistema</h3>
                 <FormField
                   control={form.control}
                   name="senha"
                   render={({ field }) => (
                      <FormItem>
                        <FormLabel>{clienteToEdit ? 'Nova Senha (Opcional)' : 'Senha Temporária (Opcional)'}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={clienteToEdit ? "Nova senha para o cliente" : "Senha para o cliente"} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {clienteToEdit 
                            ? 'Deixe em branco para manter a senha atual'
                            : 'Se não informada, o cliente poderá usar "Esqueci minha senha" para criar uma'
                          }
                        </p>
                      </FormItem>
                   )}
                 />
               </div>
             </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              <User className="w-4 h-4 mr-2" />
              {isLoading 
                ? (clienteToEdit ? 'Atualizando...' : 'Cadastrando...') 
                : (clienteToEdit ? 'Atualizar Cliente' : 'Cadastrar Cliente')
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}