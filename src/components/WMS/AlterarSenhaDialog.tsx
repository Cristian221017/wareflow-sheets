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
import { Checkbox } from '@/components/ui/checkbox';
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
  confirmacao: z.boolean().refine(val => val === true, {
    message: "Você deve confirmar antes de enviar"
  })
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
      confirmacao: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Enviar email de reset de senha para o usuário
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Erro ao enviar reset de senha:', error);
        toast.error('Erro ao enviar reset de senha: ' + error.message);
        return;
      }

      // Enviar email de notificação personalizado (opcional)
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: userEmail,
            subject: 'Reset de Senha - Sistema WMS',
            type: 'reset_senha',
            data: {
              nome: userName,
              email: userEmail
            }
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de notificação:', emailError);
      }

      toast.success('Email de reset de senha enviado! O usuário deve verificar sua caixa de entrada e seguir as instruções.');
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
            Reset de Senha
          </DialogTitle>
          <DialogDescription>
            Será enviado um email de reset de senha para {userName} ({userEmail}).
            O usuário deve seguir as instruções no email para definir uma nova senha.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmacao"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Confirmo que quero enviar o email de reset de senha para este usuário
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !form.watch('confirmacao')}>
                <KeyRound className="w-4 h-4 mr-2" />
                {isLoading ? 'Enviando...' : 'Enviar Reset de Senha'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}