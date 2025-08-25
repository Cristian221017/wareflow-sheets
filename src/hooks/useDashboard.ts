import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  userType: 'transportadora' | 'cliente';
  transportadoraId: string;
  clienteId?: string;
  solicitacoesPendentes: number;
  nfsArmazenadas: number;
  nfsConfirmadas: number;
  docsVencendo: number;
  docsVencidos: number;
  valorPendente?: number;
  valorVencido?: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard", "current-user"],
    queryFn: async (): Promise<DashboardStats | null> => {
      console.log('📊 Buscando estatísticas do dashboard...');
      
      const { data, error } = await supabase.rpc("get_current_user_dashboard" as any);
      
      if (error) {
        console.error('❌ Erro ao buscar dashboard:', error);
        throw new Error(`Erro ao buscar dashboard: ${error.message}`);
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('📊 Nenhuma estatística encontrada');
        return null;
      }
      
      const stats = data[0];
      
      const dashboardStats: DashboardStats = {
        userType: stats.user_type as 'transportadora' | 'cliente',
        transportadoraId: stats.transportadora_id,
        clienteId: stats.cliente_id,
        solicitacoesPendentes: Number(stats.solicitacoes_pendentes) || 0,
        nfsArmazenadas: Number(stats.nfs_armazenadas) || 0,
        nfsConfirmadas: Number(stats.nfs_confirmadas) || 0,
        docsVencendo: Number(stats.docs_vencendo) || 0,
        docsVencidos: Number(stats.docs_vencidos) || 0,
        valorPendente: stats.valor_pendente ? Number(stats.valor_pendente) : undefined,
        valorVencido: stats.valor_vencido ? Number(stats.valor_vencido) : undefined,
      };
      
      console.log('📊 Dashboard carregado:', dashboardStats);
      return dashboardStats;
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}

export interface RealtimeEvent {
  entityType: string;
  entityId: string;
  lastUpdate: string;
  status: string;
  actorId: string;
}

export function useRealtimeEvents() {
  return useQuery({
    queryKey: ["realtime", "events"],
    queryFn: async (): Promise<RealtimeEvent[]> => {
      console.log('🔄 Buscando eventos em tempo real...');
      
      const { data, error } = await supabase.rpc("get_realtime_stats" as any);
      
      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        return [];
      }
      
      const events: RealtimeEvent[] = Array.isArray(data) ? data.map((event: any) => ({
        entityType: event.entity_type,
        entityId: event.entity_id,
        lastUpdate: event.last_update,
        status: event.status,
        actorId: event.actor_id,
      })) : [];
      
      console.log(`🔄 ${events.length} eventos encontrados`);
      return events;
    },
    staleTime: 10000, // 10 segundos
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
}