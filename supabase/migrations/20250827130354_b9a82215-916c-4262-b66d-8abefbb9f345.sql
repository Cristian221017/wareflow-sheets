-- Criar função de limpeza automática de logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_system_logs INTEGER := 0;
  deleted_event_logs INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calcular data de corte
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Limpar system_logs antigos
  DELETE FROM public.system_logs 
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_system_logs = ROW_COUNT;
  
  -- Limpar event_log antigos  
  DELETE FROM public.event_log
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_event_logs = ROW_COUNT;
  
  -- Log da limpeza executada
  INSERT INTO public.system_logs (
    actor_user_id, actor_role, entity_type, action, status, message, meta
  ) VALUES (
    NULL, 'system', 'MAINTENANCE', 'LOG_CLEANUP', 'INFO',
    'Limpeza automática de logs executada',
    jsonb_build_object(
      'retention_days', retention_days,
      'cutoff_date', cutoff_date,
      'deleted_system_logs', deleted_system_logs,
      'deleted_event_logs', deleted_event_logs
    )
  );
  
  RETURN deleted_system_logs + deleted_event_logs;
END;
$$;

-- Criar função para executar limpeza diária (será chamada via cron job ou manualmente)
CREATE OR REPLACE FUNCTION public.daily_log_cleanup()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Executar limpeza com retenção de 30 dias
  RETURN public.cleanup_old_logs(30);
END;
$$;

-- Adicionar índices para melhorar performance da limpeza
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at 
ON public.system_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_event_log_created_at 
ON public.event_log(created_at);

-- Comentário documentando a política
COMMENT ON FUNCTION public.cleanup_old_logs IS 
'Limpa logs mais antigos que o período de retenção especificado (padrão: 30 dias)';

COMMENT ON FUNCTION public.daily_log_cleanup IS 
'Executa limpeza diária automática mantendo logs dos últimos 30 dias';