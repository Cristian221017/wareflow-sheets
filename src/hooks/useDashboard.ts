import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardRPCResult, RealtimeStatsRPCResult } from "@/types/api";

export interface DashboardStats {
  userType: 'transportadora' | 'cliente';
  transportadoraId: string;
  clienteId?: string;
  solicitacoesPendentes: number;
  nfsArmazenadas: number;
  nfsConfirmadas: number;
  nfsEmViagem: number;
  nfsEntregues: number;
  docsVencendo: number;
  docsVencidos: number;
  valorPendente?: number;
  valorVencido?: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard", "current-user"],
    queryFn: async (): Promise<DashboardStats | null> => {
      const { data, error } = await (supabase.rpc as any)("get_current_user_dashboard", {});
      
      if (error) {
        console.error('❌ Erro no dashboard RPC:', error);
        throw new Error(`Erro ao buscar dashboard: ${error.message}`);
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('⚠️ Dashboard retornou dados vazios');
        return null;
      }
      
      const stats = data[0] as DashboardRPCResult;
      console.log('📊 Dashboard stats raw from RPC:', stats);
      
      const dashboardStats: DashboardStats = {
        userType: stats.user_type as 'transportadora' | 'cliente',
        transportadoraId: stats.transportadora_id,
        clienteId: stats.cliente_id,
        solicitacoesPendentes: Number(stats.solicitacoes_pendentes) || 0,
        nfsArmazenadas: Number(stats.nfs_armazenadas) || 0,
        nfsConfirmadas: Number(stats.nfs_confirmadas) || 0,
        nfsEmViagem: Number(stats.nfs_em_viagem) || 0,
        nfsEntregues: Number(stats.nfs_entregues) || 0,
        docsVencendo: Number(stats.docs_vencendo) || 0,
        docsVencidos: Number(stats.docs_vencidos) || 0,
        valorPendente: stats.valor_pendente ? Number(stats.valor_pendente) : undefined,
        valorVencido: stats.valor_vencido ? Number(stats.valor_vencido) : undefined,
      };
      
      console.log('📊 Dashboard stats processed:', dashboardStats);
      return dashboardStats;
    },
    staleTime: 10000, // Reduzir para 10 segundos para sincronização mais rápida
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Auto-refresh a cada 30 segundos
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
      const { data, error } = await (supabase.rpc as any)("get_realtime_stats", {});
      
      if (error) {
        return [];
      }
      
      const events: RealtimeEvent[] = Array.isArray(data) ? data.map((event: RealtimeStatsRPCResult) => ({
        entityType: event.entity_type,
        entityId: event.entity_id,
        lastUpdate: event.last_update,
        status: event.status,
        actorId: event.actor_id,
      })) : [];
      
      return events;
    },
    staleTime: 10000, // 10 segundos
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
}