import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Undo2 } from 'lucide-react';
import { SolicitarCarregamentoDialog, SolicitacaoCarregamentoData } from './SolicitarCarregamentoDialog';
import { useWMS } from '@/contexts/WMSContext';
import { toast } from 'sonner';

interface CarregamentoActionButtonProps {
  nfId: string;
  numeroNF: string;
  status: string;
  statusSeparacao?: string;
  canSolicitar: boolean;
  className?: string;
}

export function CarregamentoActionButton({
  nfId,
  numeroNF,
  status,
  statusSeparacao,
  canSolicitar,
  className = ""
}: CarregamentoActionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { solicitarCarregamento } = useWMS();

  const handleSolicitarCarregamento = async (data: SolicitacaoCarregamentoData) => {
    setIsLoading(true);
    try {
      // TODO: Implementar salvamento da data agendamento e documentos
      await solicitarCarregamento(numeroNF);
      
      if (data.dataAgendamento || data.observacoes || data.documentos?.length) {
        // TODO: Salvar dados adicionais da solicitação
        console.log('Dados adicionais da solicitação:', data);
      }
      
      setIsDialogOpen(false);
      toast.success('Carregamento solicitado com sucesso!');
    } catch (error) {
      console.error('Erro ao solicitar carregamento:', error);
    } finally {
      setIsLoading(false);
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
          disabled={isLoading}
          className={className}
        >
          <Truck className="w-3 h-3 mr-1" />
          {isLoading ? "Solicitando..." : "Solicitar Carregamento"}
        </Button>

        <SolicitarCarregamentoDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={handleSolicitarCarregamento}
          numeroNF={numeroNF}
          isLoading={isLoading}
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