-- Otimizar limpeza automática de logs para reduzir volume
-- Problema identificado: 70,874 system_logs e 253 WARN logs nas últimas 24h

-- 1. Criar função de limpeza mais agressiva para logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_logs_optimized(retention_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  deleted_system_logs INTEGER := 0;
  deleted_event_logs INTEGER := 0;
  deleted_debug_logs INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
  debug_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Data de corte principal
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  -- Data de corte mais agressiva para logs de debug/heartbeat (1 dia)
  debug_cutoff_date := NOW() - '1 day'::INTERVAL;
  
  -- Limpar logs de debug/heartbeat mais agressivamente
  DELETE FROM public.system_logs 
  WHERE created_at < debug_cutoff_date
    AND (
      message LIKE '%Heartbeat%' OR
      message LIKE '%enviado%' OR
      status = 'DEBUG' OR
      action = 'LOG'
    );
  
  GET DIAGNOSTICS deleted_debug_logs = ROW_COUNT;
  
  -- Limpar system_logs antigos (manter apenas logs importantes)
  DELETE FROM public.system_logs 
  WHERE created_at < cutoff_date
    AND status NOT IN ('ERROR', 'WARN'); -- Manter erros e warnings por mais tempo
  
  GET DIAGNOSTICS deleted_system_logs = ROW_COUNT;
  
  -- Limpar event_log antigos  
  DELETE FROM public.event_log
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_event_logs = ROW_COUNT;
  
  -- Log da limpeza executada (apenas se removeu algo significativo)
  IF deleted_system_logs + deleted_event_logs + deleted_debug_logs > 0 THEN
    INSERT INTO public.system_logs (
      actor_user_id, actor_role, entity_type, action, status, message, meta
    ) VALUES (
      NULL, 'system', 'MAINTENANCE', 'LOG_CLEANUP_OPTIMIZED', 'INFO',
      'Limpeza otimizada de logs executada',
      jsonb_build_object(
        'retention_days', retention_days,
        'cutoff_date', cutoff_date,
        'debug_cutoff_date', debug_cutoff_date,
        'deleted_system_logs', deleted_system_logs,
        'deleted_event_logs', deleted_event_logs,
        'deleted_debug_logs', deleted_debug_logs,
        'total_deleted', deleted_system_logs + deleted_event_logs + deleted_debug_logs
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_system_logs', deleted_system_logs,
    'deleted_event_logs', deleted_event_logs, 
    'deleted_debug_logs', deleted_debug_logs,
    'total_deleted', deleted_system_logs + deleted_event_logs + deleted_debug_logs,
    'retention_days', retention_days,
    'cutoff_date', cutoff_date
  );
END;
$function$;

-- 2. Função para detectar loops de erro
CREATE OR REPLACE FUNCTION public.detect_error_loops()
 RETURNS TABLE(
   error_pattern text,
   occurrences bigint,
   last_occurrence timestamp with time zone,
   entity_ids text[],
   suggested_action text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH error_analysis AS (
    SELECT 
      CONCAT(sl.action, ':', COALESCE(sl.meta->>'reason', 'unknown')) as pattern,
      COUNT(*) as count,
      MAX(sl.created_at) as last_seen,
      ARRAY_AGG(DISTINCT sl.meta->>'nfId') FILTER (WHERE sl.meta->>'nfId' IS NOT NULL) as nf_ids,
      ARRAY_AGG(DISTINCT sl.meta->>'cleanNfId') FILTER (WHERE sl.meta->>'cleanNfId' IS NOT NULL) as clean_nf_ids
    FROM system_logs sl
    WHERE sl.status IN ('ERROR', 'WARN')
      AND sl.created_at > NOW() - INTERVAL '24 hours'
      AND sl.action LIKE '%FAIL%'
    GROUP BY CONCAT(sl.action, ':', COALESCE(sl.meta->>'reason', 'unknown'))
    HAVING COUNT(*) >= 5 -- Considerar loop se >= 5 ocorrências
  )
  SELECT 
    ea.pattern,
    ea.count,
    ea.last_seen,
    COALESCE(ea.nf_ids, ea.clean_nf_ids),
    CASE 
      WHEN ea.pattern LIKE 'NF_DELETE_FAIL%' THEN 'Verificar se NF existe antes de tentar excluir. Implementar cache de exclusões.'
      WHEN ea.pattern LIKE '%LOGIN_FAILURE%' THEN 'Investigar tentativas de login maliciosas ou configuração de auth.'
      WHEN ea.count > 20 THEN 'Loop crítico - implementar throttling imediato'
      ELSE 'Monitorar padrão de erro recorrente'
    END as suggested_action
  FROM error_analysis ea
  ORDER BY ea.count DESC, ea.last_seen DESC;
END;
$function$;

-- 3. Executar limpeza inicial otimizada
SELECT public.cleanup_old_logs_optimized(3); -- Manter apenas 3 dias de logs normais