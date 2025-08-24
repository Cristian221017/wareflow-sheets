import { useMemo } from 'react';
import { useAllNFs } from './useNFs';
import { useLastVisit } from './useLastVisit';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { useWMS } from '@/contexts/WMSContext';

export function useNotifications() {
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();
  const { pedidosLiberados } = useWMS();
  const { documentosFinanceiros } = useFinanceiro();
  const { hasNewItems, getLastVisit } = useLastVisit();

  const notifications = useMemo(() => {
    // Função para contar apenas itens novos
    const countNewItems = (key: any, items: any[]) => {
      if (!items?.length) return 0;
      
      const lastVisit = getLastVisit(key);
      if (!lastVisit) return items.length;
      
      return items.filter(item => {
        const itemDate = new Date(item.updated_at || item.created_at);
        return itemDate > lastVisit;
      }).length;
    };

    return {
      // Para clientes
      nfsConfirmadas: countNewItems('nfs-confirmadas', confirmadas || []),
      pedidosLiberados: countNewItems('pedidos-liberados', pedidosLiberados || []),
      documentosFinanceiros: countNewItems('documentos-financeiros', documentosFinanceiros || []),
      
      // Para transportadores  
      solicitacoesPendentes: countNewItems('solicitacoes-pendentes', solicitadas || []),
      nfsArmazenadas: countNewItems('nfs-armazenadas', armazenadas || []),
    };
  }, [armazenadas, solicitadas, confirmadas, pedidosLiberados, documentosFinanceiros, getLastVisit]);

  return notifications;
}