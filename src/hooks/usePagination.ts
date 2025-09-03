import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';

export interface PaginationConfig {
  pageSize?: number;
  defaultPage?: number;
}

export interface PaginatedQuery<T> {
  data: T[];
  count: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  isLoading: boolean;
  error: Error | null;
}

export function usePaginatedQuery<T = any>(
  queryKey: string[],
  tableName: keyof Database['public']['Tables'],
  selectFields = '*',
  config: PaginationConfig = {},
  additionalFilters?: Record<string, any>
): PaginatedQuery<T> {
  const { pageSize = 50, defaultPage = 1 } = config;
  const [currentPage, setCurrentPage] = useState(defaultPage);

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKey, currentPage, pageSize],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(tableName as any)
        .select(selectFields, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply additional filters if provided
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            query = (query as any).eq(key, value);
          }
        });
      }

      const { data: records, error, count } = await query;
      
      if (error) throw error;
      
      return {
        records: records || [],
        count: count || 0
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  const totalPages = useMemo(() => {
    if (!data?.count) return 1;
    return Math.ceil(data.count / pageSize);
  }, [data?.count, pageSize]);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    data: (data?.records as T[]) || [],
    count: data?.count || 0,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage,
    previousPage,
    goToPage,
    isLoading,
    error: error as Error | null
  };
}

// Specialized hook for NFs with pagination
export function usePaginatedNFs(status?: string, pageSize = 50) {
  return usePaginatedQuery<any>(
    ['nfs-paginated', status || 'all'],
    'notas_fiscais',
    `
      id, numero_nf, produto, status, status_separacao,
      peso, volume, localizacao, created_at, updated_at,
      cliente_id, transportadora_id
    `,
    { pageSize },
    status ? { status } : undefined
  );
}