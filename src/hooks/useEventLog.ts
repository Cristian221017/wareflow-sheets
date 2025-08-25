import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  actor_id: string;
  actor_role: string;
  payload: any;
  correlation_id: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  status: string;
  message: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  transportadora_id: string | null;
  cliente_id: string | null;
  meta: any;
  correlation_id: string;
  created_at: string;
}

export interface EventLogFilters {
  entity_type?: string;
  event_type?: string;
  actor_role?: string;
  date_from?: string;
  date_to?: string;
  correlation_id?: string;
  search?: string;
}

export function useEventLog(filters: EventLogFilters = {}, limit = 100) {
  const { user } = useAuth();
  const [events, setEvents] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchEvents = async (resetOffset = false) => {
    if (!user?.role || user.role !== 'super_admin') {
      setError('Acesso negado - apenas Super Admins podem ver logs');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('system_logs' as any)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.event_type) {
        query = query.eq('action', filters.event_type);
      }
      if (filters.actor_role) {
        query = query.eq('actor_role', filters.actor_role);
      }
      if (filters.correlation_id) {
        query = query.eq('correlation_id', filters.correlation_id);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Text search in meta
      if (filters.search) {
        query = query.or(`meta->>'nf_numero'.ilike.%${filters.search}%,meta->>'numero_cte'.ilike.%${filters.search}%,action.ilike.%${filters.search}%`);
      }

      const currentOffset = resetOffset ? 0 : offset;
      query = query.range(currentOffset, currentOffset + limit - 1);

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Erro ao buscar logs:', queryError);
        throw queryError;
      }

      const newEvents = (data || []).map((log: any) => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        status: log.status,
        message: log.message,
        actor_user_id: log.actor_user_id,
        actor_role: log.actor_role,
        transportadora_id: log.transportadora_id,
        cliente_id: log.cliente_id,
        meta: log.meta || {},
        correlation_id: log.correlation_id,
        created_at: log.created_at,
      }));
      
      if (resetOffset) {
        setEvents(newEvents);
        setOffset(limit);
      } else {
        setEvents(prev => [...prev, ...newEvents]);
        setOffset(prev => prev + limit);
      }

      setHasMore(newEvents.length === limit);
    } catch (err) {
      console.error('❌ Erro ao carregar system logs:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchEvents(false);
    }
  };

  const refetch = () => {
    setOffset(0);
    fetchEvents(true);
  };

  useEffect(() => {
    setOffset(0);
    fetchEvents(true);
  }, [filters.entity_type, filters.event_type, filters.actor_role, filters.date_from, filters.date_to, filters.correlation_id, filters.search, user?.role]);

  return {
    events,
    loading,
    error,
    hasMore,
    loadMore,
    refetch
  };
}