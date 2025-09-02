import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFluxoMutations } from '@/hooks/useNFs';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';
import type { NotaFiscal } from '@/types/nf';

interface NFDeleteManagerProps {
  children: (props: {
    canDelete: boolean;
    onDelete: (nfId: string) => void;
  }) => React.ReactNode;
}

export function NFDeleteManager({ children }: NFDeleteManagerProps) {
  const { user } = useAuth();
  const { excluir } = useFluxoMutations();
  const [deleteNfId, setDeleteNfId] = useState<string | null>(null);
  const [nfToDelete, setNfToDelete] = useState<NotaFiscal | null>(null);

  // Apenas transportadoras podem excluir NFs
  const canDelete = user?.type === 'transportadora' && 
    ['admin_transportadora', 'super_admin', 'operador'].includes(user?.role || '');

  const handleDelete = (nfId: string) => {
    setDeleteNfId(nfId);
  };

  const confirmDelete = () => {
    if (deleteNfId) {
      excluir.mutate(deleteNfId);
      setDeleteNfId(null);
    }
  };

  return (
    <>
      {children({
        canDelete,
        onDelete: handleDelete
      })}
      
      <DoubleConfirmDialog
        open={!!deleteNfId}
        onOpenChange={(open) => !open && setDeleteNfId(null)}
        title="Excluir Nota Fiscal"
        description="Esta ação não pode ser desfeita. A nota fiscal e todos os dados relacionados (eventos, solicitações, pedidos) serão permanentemente removidos do sistema."
        confirmText="Excluir NF"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
}