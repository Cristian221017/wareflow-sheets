import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, Undo2 } from 'lucide-react';
import { SolicitarCarregamentoDialog, SolicitacaoCarregamentoData } from './SolicitarCarregamentoDialog';
import { useWMS } from '@/contexts/WMSContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      // Solicitar carregamento
      await solicitarCarregamento(numeroNF);
      
      // Salvar dados adicionais da solicitação se fornecidos
      if (data.dataAgendamento || data.observacoes || data.documentos?.length) {
        const updateData: any = {};
        
        if (data.dataAgendamento) {
          updateData.data_agendamento_entrega = data.dataAgendamento;
        }
        
        if (data.observacoes) {
          updateData.observacoes_solicitacao = data.observacoes;
        }
        
        if (data.documentos?.length) {
          // Por simplicidade, salvamos apenas os nomes dos arquivos
          // Em um cenário real, você faria upload dos arquivos primeiro
          updateData.documentos_anexos = data.documentos.map(doc => ({
            nome: doc.name,
            tamanho: doc.size,
            tipo: doc.type,
            data_upload: new Date().toISOString()
          }));
        }
        
        // Atualizar NF com dados adicionais
        await supabase
          .from('notas_fiscais')
          .update(updateData)
          .eq('numero_nf', numeroNF);
      }
      
      setIsDialogOpen(false);
      toast.success('Carregamento solicitado com sucesso!');
    } catch (error) {
      console.error('Erro ao solicitar carregamento:', error);
      toast.error('Erro ao solicitar carregamento');
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