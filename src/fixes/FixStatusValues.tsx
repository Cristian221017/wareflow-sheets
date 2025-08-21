// Correção automática dos valores de status para os arquivos que ainda usam enum antigo

// Este arquivo pode ser removido após as correções aplicadas
export const statusCorrections = {
  'ARMAZENADA': 'Armazenada',
  'SOLICITADA': 'Ordem Solicitada', 
  'CONFIRMADA': 'Solicitação Confirmada'
};

// Aplicar correções nos arquivos principais
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

// Hook para aplicar filtros com status correto
export function useNFStatusFilters() {
  const { notasFiscais } = useWMS();
  const { user } = useAuth();

  return useMemo(() => {
    const clienteNFs = notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj);
    
    return {
      armazenadas: notasFiscais.filter(nf => nf.status === 'Armazenada'),
      solicitadas: notasFiscais.filter(nf => nf.status === 'Ordem Solicitada'),
      confirmadas: notasFiscais.filter(nf => nf.status === 'Solicitação Confirmada'),
      
      // Para clientes específicos
      clienteArmazenadas: clienteNFs.filter(nf => nf.status === 'Armazenada'),
      clienteSolicitadas: clienteNFs.filter(nf => nf.status === 'Ordem Solicitada'),
      clienteConfirmadas: clienteNFs.filter(nf => nf.status === 'Solicitação Confirmada')
    };
  }, [notasFiscais, user?.cnpj]);
}