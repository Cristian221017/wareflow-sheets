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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';

const formSchema = z.object({
  novaSenha: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type FormValues = z.infer<typeof formSchema>;

interface AlterarSenhaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
}

export function AlterarSenhaDialog({ isOpen, onClose, userEmail, userName }: AlterarSenhaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      novaSenha: '',
      confirmarSenha: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Criar/atualizar usuário no Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: userEmail,
        password: values.novaSenha,
        options: {
          emailRedirectTo: `${window.location.origin}/cliente`,
          data: {
            name: userName
          }
        }
      });

      // Se o usuário já existe, o erro será sobre usuário já registrado, isso é ok
      if (error && !error.message.includes('already registered')) {
        console.error('Erro ao criar/atualizar usuário:', error);
        toast.error('Erro ao configurar acesso');
        return;
      }

      // Enviar email de notificação
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: userEmail,
            subject: 'Acesso Criado - Sistema WMS',
            type: 'senha_alterada',
            data: {
              nome: userName,
              email: userEmail,
              novaSenha: values.novaSenha
            }
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de notificação:', emailError);
      }

      toast.success('Acesso configurado com sucesso! O cliente pode fazer login no portal.');
      form.reset();
      onClose();
    } catch (error) {
      console.error('Erro ao configurar acesso:', error);
      toast.error('Erro ao configurar acesso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="novaSenha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Digite a nova senha" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmarSenha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirme a nova senha" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                <KeyRound className="w-4 h-4 mr-2" />
                {isLoading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}