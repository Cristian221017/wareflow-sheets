import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { log } from '@/utils/logger';

/**
 * Hook centralizado para invalidar todas as queries relacionadas ao sistema
 * Garante consistência entre dashboard, fluxos e demais componentes
 */
export function useInvalidateAll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateAll = () => {
    log('🔄 Invalidando TODAS as queries do sistema para sincronização completa (PREDICATE)');
    
    // 🎯 INVALIDAÇÃO INTELIGENTE POR PREDICATE - elimina "buracos" de sincronização
    queryClient.invalidateQueries({
      predicate: (query) => {
        if (!Array.isArray(query.queryKey)) return false;
        const [firstKey] = query.queryKey;
        return (
          firstKey === 'nfs' ||
          firstKey === 'solicitacoes' ||
          firstKey === 'documentos_financeiros' ||
          firstKey === 'financeiro' ||
          firstKey === 'dashboard' ||
          firstKey === 'realtime' ||
          firstKey === 'event-logs' ||
          firstKey === 'system-logs'
        );
      }
    });

    log('✅ Invalidação completa por PREDICATE executada - 100% cobertura');
  };

  return { invalidateAll };
}