import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Package, Clock, CheckCircle, AlertTriangle, Pencil, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { log, warn, error as logError } from '@/utils/logger';

interface StatusSeparacaoManagerProps {
  nfId: string;
  statusAtual: string;
  numeroNf: string;
  canEdit?: boolean;
  onStatusChanged?: () => void;
}

type SeparacaoStatus = 'pendente' | 'em_separacao' | 'separacao_concluida' | 'separacao_com_pendencia' | 'em_viagem' | 'entregue';

const statusConfig = {
  pendente: {
    label: 'Pendente',
    icon: Clock,
    variant: 'secondary' as const,
    description: 'Aguardando início da separação'
  },
  em_separacao: {
    label: 'Em Separação',
    icon: Package,
    variant: 'default' as const,
    description: 'Mercadoria sendo separada'
  },
  separacao_concluida: {
    label: 'Separação Concluída',
    icon: CheckCircle,
    variant: 'default' as const,
    description: 'Separação finalizada com sucesso'
  },
  separacao_com_pendencia: {
    label: 'Separação com Pendência',
    icon: AlertTriangle,
    variant: 'destructive' as const,
    description: 'Separação com problemas ou itens faltantes'
  },
  em_viagem: {
    label: 'Em Viagem',
    icon: Truck,
    variant: 'default' as const,
    description: 'Mercadoria despachada e em transporte'
  },
  entregue: {
    label: 'Entregue',
    icon: CheckCircle,
    variant: 'default' as const,
    description: 'Mercadoria entregue ao destinatário'
  }
};

export function StatusSeparacaoManager({ 
  nfId, 
  statusAtual, 
  numeroNf, 
  canEdit = false,
  onStatusChanged 
}: StatusSeparacaoManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState<SeparacaoStatus>(statusAtual as SeparacaoStatus);
  const [observacoes, setObservacoes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const currentConfig = statusConfig[statusAtual as SeparacaoStatus] || statusConfig.pendente;
  const CurrentIcon = currentConfig.icon;

  const handleUpdateStatus = async () => {
    if (novoStatus === statusAtual) {
      toast({
        title: "Nenhuma alteração",
        description: "O status selecionado é o mesmo atual.",
        variant: "default"
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      log('🔄 Atualizando status de separação:', { nfId, statusAtual, novoStatus, observacoes });

      const { error } = await (supabase.rpc as any)('nf_update_status_separacao', {
        p_nf_id: nfId,
        p_status_separacao: novoStatus,
        p_observacoes: observacoes || null
      });

      if (error) {
        logError('Erro ao atualizar status de separação:', error);
        toast({
          title: "Erro ao atualizar status",
          description: error.message || "Erro interno do servidor",
          variant: "destructive"
        });
        return;
      }

      log('✅ Status de separação atualizado com sucesso');
      
      // Usar invalidação otimizada para responsividade instantânea
      if (onStatusChanged) {
        onStatusChanged();
      }
      
      // Forçar re-render imediato com estado local
      setTimeout(() => {
        // Aguardar um pouco para que o realtime atualize
        onStatusChanged?.();
      }, 100);
      
      toast({
        title: "Status atualizado",
        description: `Status da NF ${numeroNf} alterado para: ${statusConfig[novoStatus].label}`,
        variant: "default"
      });

      setIsOpen(false);
      setObservacoes('');

    } catch (err) {
      logError('Erro inesperado ao atualizar status:', err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Se não pode editar, mostra apenas o badge (removido lock no separacao_concluida)
  if (!canEdit) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={currentConfig.variant} className="flex items-center gap-1">
          <CurrentIcon className="w-3 h-3" />
          {currentConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={currentConfig.variant} className="flex items-center gap-1">
        <CurrentIcon className="w-3 h-3" />
        {currentConfig.label}
      </Badge>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Pencil className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Status de Separação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                NF: {numeroNf}
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Novo Status</Label>
              <Select value={novoStatus} onValueChange={(value) => setNovoStatus(value as SeparacaoStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-xs text-muted-foreground">{config.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione observações sobre a alteração do status..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? 'Atualizando...' : 'Atualizar Status'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}