import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SLAMetrics {
  userType: 'transportadora' | 'cliente';
  transportadoraId: string;
  clienteId?: string;
  tempoMedioEntregaHoras: number;
  slaCumprimentoPercent: number;
  entregasNoPrazo: number;
  entregasAtrasadas: number;
  mercadoriasEmAtraso: number;
}

export interface SLARPCResult {
  user_type: 'transportadora' | 'cliente';
  transportadora_id: string;
  cliente_id?: string;
  tempo_medio_entrega_horas: number;
  sla_cumprimento_percent: number;
  entregas_no_prazo: number;
  entregas_atrasadas: number;
  mercadorias_em_atraso: number;
}

export function useSLAMetrics() {
  return useQuery({
    queryKey: ["sla-metrics", "current-user"],
    queryFn: async (): Promise<SLAMetrics | null> => {
      const { data, error } = await (supabase.rpc as any)("get_dashboard_sla_metrics", {});
      
      if (error) {
        console.error('❌ Erro no SLA metrics RPC:', error);
        return null;
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('⚠️ SLA metrics retornou dados vazios');
        return null;
      }
      
      const metrics = data[0] as SLARPCResult;
      
      return {
        userType: metrics.user_type as 'transportadora' | 'cliente',
        transportadoraId: metrics.transportadora_id,
        clienteId: metrics.cliente_id,
        tempoMedioEntregaHoras: Number(metrics.tempo_medio_entrega_horas) || 0,
        slaCumprimentoPercent: Number(metrics.sla_cumprimento_percent) || 0,
        entregasNoPrazo: Number(metrics.entregas_no_prazo) || 0,
        entregasAtrasadas: Number(metrics.entregas_atrasadas) || 0,
        mercadoriasEmAtraso: Number(metrics.mercadorias_em_atraso) || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Auto-refresh a cada 30 segundos
  });
}