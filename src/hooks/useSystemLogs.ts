import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery } from "@tanstack/react-query";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogFilters = {
  q?: string;
  level?: LogLevel[];
  entityType?: string[];
  action?: string[];
  transportadoraId?: string;
  clienteId?: string;
  from?: string;
  to?: string;
};

export type SystemLog = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  transportadora_id: string | null;
  cliente_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  status: LogLevel;
  message: string | null;
  meta: any;
  correlation_id: string;
  ip: string | null;
  user_agent: string | null;
};

export function useSystemLogs(filters: LogFilters) {
  return useInfiniteQuery({
    queryKey: ["system_logs", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = (supabase as any)
        .from("system_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (filters.level?.length) {
        query = query.in("status", filters.level);
      }
      if (filters.entityType?.length) {
        query = query.in("entity_type", filters.entityType);
      }
      if (filters.action?.length) {
        query = query.in("action", filters.action);
      }
      if (filters.transportadoraId) {
        query = query.eq("transportadora_id", filters.transportadoraId);
      }
      if (filters.clienteId) {
        query = query.eq("cliente_id", filters.clienteId);
      }
      if (filters.from) {
        query = query.gte("created_at", filters.from);
      }
      if (filters.to) {
        query = query.lte("created_at", filters.to);
      }
      if (filters.q) {
        query = query.or(`message.ilike.%${filters.q}%,meta::text.ilike.%${filters.q}%`);
      }

      const limit = 50;
      const from = pageParam * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      
      return {
        rows: (data as any[] || []).map((item: any) => item as SystemLog),
        next: (data?.length === limit) ? pageParam + 1 : null,
        total: count ?? 0
      };
    },
    getNextPageParam: (lastPage) => lastPage.next,
  });
}