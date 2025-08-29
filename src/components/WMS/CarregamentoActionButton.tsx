import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Undo2 } from 'lucide-react';
import { SolicitarCarregamentoDialog, SolicitacaoCarregamentoData } from './SolicitarCarregamentoDialog';
import { useFluxoMutations } from '@/hooks/useNFs';
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
  const { solicitar } = useFluxoMutations();

  const handleSolicitarCarregamento = async (data: SolicitacaoCarregamentoData) => {
    try {
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
      await solicitar.mutateAsync({ 
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
          disabled={solicitar.isPending}
          className={className}
        >
          <Truck className="w-3 h-3 mr-1" />
          {solicitar.isPending ? "Solicitando..." : "Solicitar Carregamento"}
        </Button>

        <SolicitarCarregamentoDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={handleSolicitarCarregamento}
          numeroNF={numeroNF}
          isLoading={solicitar.isPending}
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