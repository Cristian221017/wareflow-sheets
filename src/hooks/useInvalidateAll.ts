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
    log('🔄 Invalidando TODAS as queries do sistema para sincronização completa');
    
    const scope = user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId;
    const statuses = ['ARMAZENADA', 'SOLICITADA', 'CONFIRMADA', 'PENDENTE'];
    const userTypes = ['cliente', 'transportadora'];

    // 1. DASHBOARD - fonte crítica de dados
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'current-user'] });

    // 2. SOLICITAÇÕES - sistema unificado
    queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'cliente'] });
    queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'transportadora'] });
    queryClient.invalidateQueries({ queryKey: ['solicitacoes', 'transportadora', user?.transportadoraId ?? 'none'] });

    // 3. NFS - todas as variações
    statuses.forEach(status => {
      queryClient.invalidateQueries({ queryKey: ['nfs', status] });
      userTypes.forEach(type => {
        queryClient.invalidateQueries({ queryKey: ['nfs', status, type, scope] });
      });
    });
    queryClient.invalidateQueries({ queryKey: ['nfs'] });
    queryClient.invalidateQueries({ queryKey: ['nfs', 'cliente'] });

    // 4. FINANCEIRO
    queryClient.invalidateQueries({ queryKey: ['documentos-financeiros'] });
    queryClient.invalidateQueries({ queryKey: ['financeiro'] });

    // 5. REALTIME & LOGS
    queryClient.invalidateQueries({ queryKey: ['realtime', 'events'] });
    queryClient.invalidateQueries({ queryKey: ['event-logs'] });
    queryClient.invalidateQueries({ queryKey: ['system-logs'] });

    log('✅ Invalidação completa do sistema executada');
  };

  return { invalidateAll };
}