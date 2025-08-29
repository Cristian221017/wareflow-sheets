import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Undo2 } from 'lucide-react';
import { SolicitarCarregamentoDialog, SolicitacaoCarregamentoData } from './SolicitarCarregamentoDialog';
import { toast } from 'sonner';

interface CarregamentoActionButtonProps {
  nfId: string;
  numeroNF: string;
  status: string;
  statusSeparacao?: string;
  canSolicitar: boolean;
  className?: string;
  solicitarMutation?: {
    mutateAsync: (data: { 
      nfId: string; 
      dataAgendamento?: string;
      observacoes?: string;
      documentos?: File[];
    }) => Promise<void>;
    isPending: boolean;
  };
}

export function CarregamentoActionButton({
  nfId,
  numeroNF,
  status,
  statusSeparacao,
  canSolicitar,
  className = "",
  solicitarMutation
}: CarregamentoActionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSolicitarCarregamento = async (data: SolicitacaoCarregamentoData) => {
    try {
      if (!solicitarMutation) {
        toast.error('Funcionalidade de solicitação não disponível');
        return;
      }

      // Solicitar carregamento com dados completos
      await solicitarMutation.mutateAsync({ 
        nfId, 
        dataAgendamento: data.dataAgendamento,
        observacoes: data.observacoes,
        documentos: data.documentos
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao solicitar carregamento:', error);
    }
  };

  const handleDesfazerSolicitacao = async () => {
    // TODO: Implementar função para desfazer solicitação
    toast.info('Funcionalidade de desfazer solicitação será implementada');
  };

  // Se já foi solicitado, mostrar opção de desfazer
  if (status === 'SOLICITADA') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDesfazerSolicitacao}
        className={className}
      >
        <Undo2 className="w-3 h-3 mr-1" />
        Desfazer Solicitação
      </Button>
    );
  }

  // Se pode solicitar carregamento
  if (canSolicitar && statusSeparacao === 'separacao_concluida') {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          disabled={solicitarMutation?.isPending}
          className={className}
        >
          <Truck className="w-3 h-3 mr-1" />
          {solicitarMutation?.isPending ? "Solicitando..." : "Solicitar Carregamento"}
        </Button>

        <SolicitarCarregamentoDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={handleSolicitarCarregamento}
          numeroNF={numeroNF}
          isLoading={solicitarMutation?.isPending || false}
        />
      </>
    );
  }

  // Se separação não concluída
  if (canSolicitar && statusSeparacao !== 'separacao_concluida') {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={className}
      >
        <Truck className="w-3 h-3 mr-1" />
        Aguardando Separação
      </Button>
    );
  }

  return null;
}