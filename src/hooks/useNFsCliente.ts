import { useQuery } from '@tanstack/react-query';
import { fetchNFsCliente } from '@/lib/nfApi';
import type { NFStatus } from '@/types/nf';
import { log, auditError } from '@/utils/logger';

export function useNFsCliente(status?: NFStatus) {
  return useQuery({
    queryKey: ['nfs', 'cliente', status ?? 'todas'],
    queryFn: async () => {
      try {
        log('🔍 Buscando NFs do cliente via hook', { status });
        return await fetchNFsCliente(status);
      } catch (err: any) {
        auditError('NF_HOOK_CLIENTE_ERROR', 'NF', err, { status });
        throw err;
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}