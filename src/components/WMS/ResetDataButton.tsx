import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useWMS } from '@/contexts/WMSContext';
import { toast } from 'sonner';

export function ResetDataButton() {
  const { resetarDados } = useWMS();

  const handleReset = async () => {
    try {
      await resetarDados();
      toast.success('Dados resetados com sucesso! Sistema pronto para teste.');
    } catch (error) {
      toast.error('Erro ao resetar dados');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Resetar Dados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ Resetar Todos os Dados
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá <strong>DELETAR PERMANENTEMENTE</strong> todos os dados do sistema:
            <br />
            <br />
            • Todas as notas fiscais
            <br />
            • Todos os pedidos de liberação
            <br />
            • Todos os pedidos liberados
            <br />
            <br />
            <span className="text-destructive font-semibold">
              Esta ação não pode ser desfeita!
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sim, Resetar Tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}