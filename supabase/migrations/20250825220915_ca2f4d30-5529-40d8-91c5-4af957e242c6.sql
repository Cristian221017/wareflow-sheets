-- CORREÇÃO CRÍTICA: Atualizar todas as funções com search_path seguro
-- 1. Atualizar função de log de eventos
CREATE OR REPLACE FUNCTION public.log_event(p_actor_id uuid, p_actor_role text, p_entity_type text, p_entity_id uuid, p_event_type text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.event_log (
    actor_id, actor_role, entity_type, entity_id, event_type, payload
  ) VALUES (
    p_actor_id, p_actor_role, p_entity_type, p_entity_id, p_event_type, p_payload
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$function$;

-- 2. Atualizar função de log de sistema
CREATE OR REPLACE FUNCTION public.log_system_event(p_entity_type text, p_action text, p_status log_level DEFAULT 'INFO'::log_level, p_message text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_transportadora_id uuid DEFAULT NULL::uuid, p_cliente_id uuid DEFAULT NULL::uuid, p_meta jsonb DEFAULT '{}'::jsonb, p_correlation_id uuid DEFAULT NULL::uuid)
 RETURNS system_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_log public.system_logs;
  v_user_role text;
BEGIN
  -- Obter role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  INSERT INTO public.system_logs (
    actor_user_id, actor_role, transportadora_id, cliente_id,
    entity_type, entity_id, action, status, message, meta, correlation_id
  )
  VALUES (
    auth.uid(),
    v_user_role,
    COALESCE(p_transportadora_id, get_user_transportadora(auth.uid())),
    p_cliente_id,
    p_entity_type, p_entity_id, p_action, p_status, p_message, 
    COALESCE(p_meta, '{}'),
    COALESCE(p_correlation_id, gen_random_uuid())
  )
  RETURNING * INTO v_log;

  RETURN v_log;
END $function$;