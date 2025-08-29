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
    mutateAsync: (data: { nfId: string; dadosAgendamento?: any }) => Promise<void>;
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

      // Converter os dados para o formato esperado pela API
      const dadosAgendamento = {
        dataAgendamento: data.dataAgendamento,
        observacoes: data.observacoes,
        documentos: data.documentos?.map(doc => ({
          nome: doc.name,
          tamanho: doc.size
        }))
      };
      
      // Solicitar carregamento com dados de agendamento
      await solicitarMutation.mutateAsync({ 
        nfId, 
        dadosAgendamento 
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