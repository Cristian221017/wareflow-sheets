import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';

export interface NFEvento {
  id: string;
  nf_id: string;
  tipo: 'EMBARQUE_CONFIRMADO' | 'ENTREGA_CONFIRMADA';
  data_evento: string;
  observacoes?: string;
  anexos: any[];
  created_by?: string;
  created_at: string;
}

export interface ConfirmarEventoParams {
  nfId: string;
  data?: Date;
  observacoes?: string;
  anexos?: File[];
}

// Hook para buscar eventos de uma NF específica
export function useNFEventos(nfId?: string) {
  return useQuery({
    queryKey: ['nf_eventos', nfId],
    queryFn: async (): Promise<NFEvento[]> => {
      if (!nfId) return [];
      
      // Como a tabela nf_eventos pode não estar tipada ainda, usar query raw
      const { data, error } = await supabase
        .from('nf_eventos' as any)
        .select('*')
        .eq('nf_id', nfId)
        .order('created_at', { ascending: false });

      if (error) {
        log(`❌ Erro ao buscar eventos da NF ${nfId}:`, error);
        throw error;
      }

      return (data as unknown as NFEvento[]) || [];
    },
    enabled: !!nfId,
    staleTime: 30000,
  });
}

// Hook para buscar NFs embarcadas (com data_embarque)
export function useNFsEmbarcadas() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['nfs_embarcadas', user?.transportadoraId],
    queryFn: async () => {
      if (!user?.transportadoraId) {
        throw new Error('Usuário sem transportadora associada');
      }

      // Como data_embarque pode não estar tipada ainda, usar query raw
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(`
          *,
          clientes!inner(id, razao_social, nome_fantasia)
        `)
        .eq('transportadora_id', user.transportadoraId)
        .not('data_embarque' as any, 'is', null)
        .is('data_entrega' as any, null)
        .order('data_embarque' as any, { ascending: false });

      if (error) {
        log('❌ Erro ao buscar NFs embarcadas:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!(user && user.transportadoraId),
    staleTime: 30000,
  });
}

// Hook para buscar NFs entregues (com data_entrega)
export function useNFsEntregues() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['nfs_entregues', user?.transportadoraId],
    queryFn: async () => {
      if (!user?.transportadoraId) {
        throw new Error('Usuário sem transportadora associada');
      }

      // Como data_entrega pode não estar tipada ainda, usar query raw
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(`
          *,
          clientes!inner(id, razao_social, nome_fantasia)
        `)
        .eq('transportadora_id', user.transportadoraId)
        .not('data_entrega' as any, 'is', null)
        .order('data_entrega' as any, { ascending: false });

      if (error) {
        log('❌ Erro ao buscar NFs entregues:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!(user && user.transportadoraId),
    staleTime: 30000,
  });
}

// Hook para mutations de embarque/entrega
export function useNFEventosMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const confirmarEmbarque = useMutation({
    mutationFn: async ({ nfId, data, observacoes, anexos }: ConfirmarEventoParams) => {
      // Upload de anexos - implementação futura
      const anexosJson = anexos ? [] : []; // Implementar upload depois
      
      const { error } = await supabase.rpc('nf_confirmar_embarque' as any, {
        p_nf_id: nfId,
        p_data: data?.toISOString(),
        p_observacoes: observacoes,
        p_anexos: anexosJson
      });

      if (error) {
        log('❌ Erro ao confirmar embarque:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas usando predicate
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          const [firstKey] = query.queryKey;
          return (
            firstKey === 'nfs' ||
            firstKey === 'nfs_embarcadas' ||
            firstKey === 'nfs_entregues' ||
            firstKey === 'nf_eventos' ||
            firstKey === 'solicitacoes' ||
            firstKey === 'dashboard'
          );
        }
      });

      toast({
        title: "Embarque confirmado",
        description: "O embarque foi confirmado com sucesso.",
      });

      log('✅ Embarque confirmado com sucesso');
    },
    onError: (error) => {
      toast({
        title: "Erro ao confirmar embarque",
        description: "Ocorreu um erro ao confirmar o embarque. Tente novamente.",
        variant: "destructive",
      });
      log('❌ Erro ao confirmar embarque:', error);
    },
  });

  const confirmarEntrega = useMutation({
    mutationFn: async ({ nfId, data, observacoes, anexos }: ConfirmarEventoParams) => {
      // Upload de anexos - implementação futura
      const anexosJson = anexos ? [] : []; // Implementar upload depois
      
      const { error } = await supabase.rpc('nf_confirmar_entrega' as any, {
        p_nf_id: nfId,
        p_data: data?.toISOString(),
        p_observacoes: observacoes,
        p_anexos: anexosJson
      });

      if (error) {
        log('❌ Erro ao confirmar entrega:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas usando predicate
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          const [firstKey] = query.queryKey;
          return (
            firstKey === 'nfs' ||
            firstKey === 'nfs_embarcadas' ||
            firstKey === 'nfs_entregues' ||
            firstKey === 'nf_eventos' ||
            firstKey === 'solicitacoes' ||
            firstKey === 'dashboard'
          );
        }
      });

      toast({
        title: "Entrega confirmada",
        description: "A entrega foi confirmada com sucesso.",
      });

      log('✅ Entrega confirmada com sucesso');
    },
    onError: (error) => {
      toast({
        title: "Erro ao confirmar entrega",
        description: "Ocorreu um erro ao confirmar a entrega. Tente novamente.",
        variant: "destructive",
      });
      log('❌ Erro ao confirmar entrega:', error);
    },
  });

  return {
    confirmarEmbarque: {
      mutate: confirmarEmbarque.mutate,
      mutateAsync: confirmarEmbarque.mutateAsync,
      isPending: confirmarEmbarque.isPending,
    },
    confirmarEntrega: {
      mutate: confirmarEntrega.mutate,
      mutateAsync: confirmarEntrega.mutateAsync,
      isPending: confirmarEntrega.isPending,
    },
    isLoading: confirmarEmbarque.isPending || confirmarEntrega.isPending,
  };
}