// WMS Context otimizado - substitui WMSContext original
import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NotaFiscal } from '@/types/wms';
import { log, error } from '@/utils/logger';
import { handleError } from '@/utils/centralizedErrorHandler';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

interface OptimizedWMSContextType {
  // Data via React Query (sem duplicação de estado)
  notasFiscais: NotaFiscal[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Mutations otimizadas
  addNotaFiscal: {
    mutate: (data: Omit<NotaFiscal, 'id' | 'createdAt'>) => void;
    mutateAsync: (data: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<{ id: string }>;
    isPending: boolean;
  };
  
  deleteNotaFiscal: {
    mutate: (id: string) => void;
    mutateAsync: (id: string) => Promise<void>;
    isPending: boolean;
  };
  
  // Utility
  refetch: () => Promise<void>;
}

const OptimizedWMSContext = createContext<OptimizedWMSContextType | undefined>(undefined);

export function OptimizedWMSProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Aguardar auth terminar
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Query otimizada para NFs com escopo correto
  const {
    data: notasFiscais = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['nfs', 'optimized', user?.type, user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Query otimizada com JOIN para evitar N+1
        const { data, error: queryError } = await supabase
          .from('notas_fiscais')
          .select(`
            *,
            clientes!inner(
              id,
              razao_social,
              cnpj
            )
          `)
          .order('created_at', { ascending: false });

        if (queryError) throw queryError;

        return (data || []).map((nf: any) => ({
          id: nf.id,
          numeroNF: nf.numero_nf,
          numeroPedido: nf.numero_pedido,
          ordemCompra: nf.ordem_compra,
          dataRecebimento: nf.data_recebimento,
          fornecedor: nf.fornecedor,
          cnpj: nf.cnpj_fornecedor,
          clienteId: nf.cliente_id,
          cliente: nf.clientes.razao_social,
          cnpjCliente: nf.clientes.cnpj,
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: Number(nf.peso) || 0,
          volume: Number(nf.volume) || 0,
          localizacao: nf.localizacao,
          status: nf.status as 'ARMAZENADA' | 'SOLICITADA' | 'CONFIRMADA',
          statusSeparacao: nf.status_separacao || 'pendente',
          createdAt: nf.created_at,
          integration_metadata: nf.integration_metadata || {}
        })) as NotaFiscal[];
      } catch (queryError) {
        handleError(queryError as Error);
        throw queryError;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });

  // Mutation otimizada para adicionar NF
  const addNotaFiscalMutation = useMutation({
    mutationFn: async (nfData: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
      if (!user?.transportadoraId) {
        throw new Error('Usuário não tem transportadora associada');
      }

      const clienteId = nfData.clienteId;
      if (!clienteId) {
        throw new Error('Cliente não selecionado');
      }

      // Validar cliente
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id, transportadora_id, razao_social, cnpj')
        .eq('id', clienteId)
        .eq('transportadora_id', user.transportadoraId)
        .single();

      if (clienteError || !cliente) {
        throw new Error('Cliente inválido');
      }

      // Insert NF
      const { data: insertedNF, error } = await supabase
        .from('notas_fiscais')
        .insert({
          numero_nf: nfData.numeroNF,
          numero_pedido: nfData.numeroPedido,
          ordem_compra: nfData.ordemCompra,
          data_recebimento: nfData.dataRecebimento,
          fornecedor: nfData.fornecedor,
          cnpj_fornecedor: nfData.cnpj,
          cliente_id: cliente.id,
          produto: nfData.produto,
          quantidade: nfData.quantidade,
          peso: nfData.peso,
          volume: Number(nfData.volume) || 0,
          localizacao: nfData.localizacao || 'A definir',
          status: 'ARMAZENADA',
          status_separacao: nfData.statusSeparacao || 'pendente',
          transportadora_id: user.transportadoraId
        })
        .select('id')
        .single();

      if (error) throw error;
      
      return { id: insertedNF.id };
    },
    onSuccess: () => {
      toast.success('✅ Nota Fiscal cadastrada com sucesso!');
      
      // Invalidação específica e otimizada
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [firstKey] = query.queryKey as string[];
          return firstKey === 'nfs' || firstKey === 'dashboard';
        }
      });
    },
    onError: (error: Error) => {
      handleError(error);
      toast.error(error.message || 'Erro ao cadastrar Nota Fiscal');
    }
  });

  // Mutation otimizada para deletar NF
  const deleteNotaFiscalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota Fiscal excluída com sucesso');
      
      // Invalidação específica
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [firstKey] = query.queryKey as string[];
          return firstKey === 'nfs';
        }
      });
    },
    onError: (error: Error) => {
      handleError(error);
      toast.error(error.message || 'Erro ao excluir Nota Fiscal');
    }
  });

  const value: OptimizedWMSContextType = {
    notasFiscais,
    isLoading,
    isError,
    error: error as Error | null,
    
    addNotaFiscal: {
      mutate: addNotaFiscalMutation.mutate,
      mutateAsync: addNotaFiscalMutation.mutateAsync,
      isPending: addNotaFiscalMutation.isPending
    },
    
    deleteNotaFiscal: {
      mutate: deleteNotaFiscalMutation.mutate,
      mutateAsync: deleteNotaFiscalMutation.mutateAsync,
      isPending: deleteNotaFiscalMutation.isPending
    },
    
    refetch: async () => {
      await refetch();
    }
  };

  return (
    <OptimizedWMSContext.Provider value={value}>
      {children}
    </OptimizedWMSContext.Provider>
  );
}

export function useOptimizedWMS() {
  const context = useContext(OptimizedWMSContext);
  if (context === undefined) {
    throw new Error('useOptimizedWMS deve ser usado dentro de um OptimizedWMSProvider');
  }
  return context;
}