-- Corrigir função de limpeza (DEBUG não é valor válido do enum)
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
  
  -- Limpar logs de heartbeat e similares mais agressivamente
  DELETE FROM public.system_logs 
  WHERE created_at < debug_cutoff_date
    AND (
      message LIKE '%Heartbeat%' OR
      message LIKE '%enviado%' OR
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

-- Executar limpeza otimizada
SELECT public.cleanup_old_logs_optimized(3);