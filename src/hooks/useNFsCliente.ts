import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NFStatus } from '@/types/nf';
import { log, error } from '@/utils/logger';

export function useNFsCliente(status?: NFStatus) {
  return useQuery({
    queryKey: ['nfs', 'cliente', status ?? 'todas'],
    queryFn: async () => {
      log('🔍 Listando NFs do cliente via RPC', { status });
      
      try {
        const { data, error: rpcError } = await supabase.rpc('nf_listar_do_cliente', {
          p_status: status ?? null
        });
        
        if (rpcError) {
          error('❌ Erro ao listar NFs do cliente:', rpcError);
          throw rpcError;
        }
        
        log(`📋 Encontradas ${data?.length || 0} NFs para o cliente`, { status, count: data?.length });
        return data ?? [];
        
      } catch (err: any) {
        error('❌ Falha na query RPC nf_listar_do_cliente:', err);
        throw err;
      }
    },
    staleTime: 30 * 1000, // 30 segundos
    cacheTime: 5 * 60 * 1000, // 5 minutos
  });
}