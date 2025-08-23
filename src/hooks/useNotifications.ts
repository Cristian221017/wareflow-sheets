import { useMemo } from 'react';
import { useAllNFs } from './useNFs';

export function useNotifications() {
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();

  const notifications = useMemo(() => {
    return {
      // Para clientes
      nfsConfirmadas: confirmadas?.length || 0,
      pedidosLiberados: confirmadas?.length || 0,
      
      // Para transportadores
      solicitacoesPendentes: solicitadas?.length || 0,
      nfsArmazenadas: armazenadas?.length || 0,
    };
  }, [armazenadas, solicitadas, confirmadas]);

  return notifications;
}