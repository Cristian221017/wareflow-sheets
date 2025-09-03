import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Hook otimizado para cliente que faz uma única query para todos os dados necessários
export function usePerformanceOptimizedClientData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-optimized-data', user?.clienteId],
    queryFn: async () => {
      if (!user?.clienteId) return null;

      // Uma única query para buscar estatísticas do dashboard
      const { data: dashboardData, error: dashboardError } = await (supabase.rpc as any)('get_current_user_dashboard');

      if (dashboardError) throw dashboardError;

      // Query otimizada para NFs apenas com campos essenciais
      const { data: nfsData, error: nfsError } = await supabase
        .from('notas_fiscais')
        .select('id, numero_nf, status, peso, volume, created_at')
        .eq('cliente_id', user.clienteId)
        .order('created_at', { ascending: false })
        .limit(50); // Limitar para evitar carregar muitos dados

      if (nfsError) throw nfsError;

      return {
        dashboard: dashboardData?.[0] || null,
        nfs: nfsData || []
      };
    },
    enabled: !!user?.clienteId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

// Hook para operações críticas apenas
export function useOptimizedMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateQueries = useCallback(() => {
    // Invalidar apenas queries críticas
    queryClient.invalidateQueries({
      queryKey: ['client-optimized-data', user?.clienteId]
    });
  }, [user?.clienteId, queryClient]);

  return {
    invalidateQueries
  };
}