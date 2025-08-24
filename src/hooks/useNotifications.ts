import { useMemo } from 'react';
import { useAllNFs } from './useNFs';
import { useLastVisit } from './useLastVisit';
import { useFinanceiro } from '@/contexts/FinanceiroContext';

export function useNotifications() {
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();
  const { documentosFinanceiros } = useFinanceiro();
  const { hasNewItems } = useLastVisit();

  const notifications = useMemo(() => {
    return {
      // Para clientes
      nfsConfirmadas: hasNewItems('nfs-confirmadas', confirmadas || []) ? (confirmadas?.length || 0) : 0,
      pedidosLiberados: hasNewItems('pedidos-liberados', confirmadas || []) ? (confirmadas?.length || 0) : 0,
      documentosFinanceiros: hasNewItems('documentos-financeiros', documentosFinanceiros || []) ? (documentosFinanceiros?.length || 0) : 0,
      
      // Para transportadores
      solicitacoesPendentes: hasNewItems('solicitacoes-pendentes', solicitadas || []) ? (solicitadas?.length || 0) : 0,
      nfsArmazenadas: hasNewItems('nfs-armazenadas', armazenadas || []) ? (armazenadas?.length || 0) : 0,
    };
  }, [armazenadas, solicitadas, confirmadas, documentosFinanceiros, hasNewItems]);

  return notifications;
}