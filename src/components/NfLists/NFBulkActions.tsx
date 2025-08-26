import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  CheckSquare, 
  Square, 
  Minus, 
  Truck, 
  CheckCircle, 
  X,
  Package
} from 'lucide-react';
import { log, error as logError } from '@/utils/logger';
import { toast } from 'sonner';
import type { NotaFiscal } from '@/types/nf';
import { useFluxoMutations } from '@/hooks/useNFs';

interface NFBulkActionsProps {
  nfs: NotaFiscal[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  canRequest?: boolean;
  canDecide?: boolean;
  className?: string;
}

export function NFBulkActions({
  nfs,
  selectedIds,
  onSelectionChange,
  canRequest = false,
  canDecide = false,
  className = ""
}: NFBulkActionsProps) {
  const { solicitar, confirmar, recusar, isAnyLoading } = useFluxoMutations();
  const [bulkAction, setBulkAction] = useState<string>('');

  const allSelected = nfs.length > 0 && selectedIds.length === nfs.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < nfs.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(nfs.map(nf => nf.id));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos uma NF');
      return;
    }

    if (!bulkAction) {
      toast.error('Selecione uma ação');
      return;
    }

    const promises = selectedIds.map(async (id) => {
      try {
        switch (bulkAction) {
          case 'solicitar':
            await solicitar.mutateAsync(id);
            break;
          case 'confirmar':
            await confirmar.mutateAsync(id);
            break;
          case 'recusar':
            await recusar.mutateAsync(id);
            break;
        }
      } catch (error) {
        logError(`Erro ao processar NF ${id}:`, error);
        throw error;
      }
    });

    try {
      await Promise.all(promises);
      
      const actionNames = {
        solicitar: 'solicitadas',
        confirmar: 'confirmadas',
        recusar: 'recusadas'
      };
      
      toast.success(`${selectedIds.length} NFs ${actionNames[bulkAction as keyof typeof actionNames]} com sucesso!`);
      onSelectionChange([]);
      setBulkAction('');
    } catch (error) {
      toast.error('Algumas operações falharam. Verifique os itens processados.');
    }
  };

  if (nfs.length === 0) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Seleção */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="h-4 w-4"
              data-state={someSelected ? "indeterminate" : undefined}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length > 0 ? (
                <>
                  <Badge variant="secondary" className="mr-2">
                    {selectedIds.length} selecionadas
                  </Badge>
                  de {nfs.length} NFs
                </>
              ) : (
                `Selecionar todas (${nfs.length})`
              )}
            </span>
          </div>

          {/* Ações em massa */}
          {selectedIds.length > 0 && (
            <div className="flex gap-2 flex-1 justify-end">
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecionar ação" />
                </SelectTrigger>
                <SelectContent>
                  {canRequest && (
                    <SelectItem value="solicitar">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Solicitar Carregamento
                      </div>
                    </SelectItem>
                  )}
                  {canDecide && (
                    <>
                      <SelectItem value="confirmar">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Carregamento
                        </div>
                      </SelectItem>
                      <SelectItem value="recusar">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4" />
                          Recusar Carregamento
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              <Button 
                onClick={handleBulkAction}
                disabled={!bulkAction || isAnyLoading}
                size="sm"
              >
                {isAnyLoading ? 'Processando...' : 'Executar'}
              </Button>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  onSelectionChange([]);
                  setBulkAction('');
                }}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}