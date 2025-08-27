-- Corrigir funções sem search_path definido (4 warnings)

-- 1. Corrigir função log_event principal 
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

-- 2. Corrigir função log_event versão alternativa
CREATE OR REPLACE FUNCTION public.log_event(p_entity_type text, p_action text, p_status log_level DEFAULT 'INFO'::log_level, p_message text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_transportadora_id uuid DEFAULT NULL::uuid, p_cliente_id uuid DEFAULT NULL::uuid, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  INSERT INTO public.event_log(
    actor_user_id, actor_role, transportadora_id, cliente_id,
    entity_type, entity_id, action, status, message, meta
  ) VALUES (
    auth.uid(), 
    v_user_role,
    COALESCE(p_transportadora_id, public.get_user_transportadora(auth.uid())),
    p_cliente_id, 
    p_entity_type, 
    p_entity_id, 
    p_action, 
    p_status, 
    p_message, 
    COALESCE(p_meta, '{}'::jsonb)
  );
END;
$function$;

-- 3. Corrigir função get_user_transportadora (se existir) 
CREATE OR REPLACE FUNCTION public.get_user_transportadora(_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_id uuid;
BEGIN
  SELECT ut.transportadora_id INTO result_id
  FROM user_transportadoras ut
  WHERE ut.user_id = _user_id
    AND ut.is_active = true
  LIMIT 1;
  
  RETURN result_id;
END;
$function$;

-- 4. Corrigir função has_role (se existir)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_transportadoras ut
    WHERE ut.user_id = _user_id
      AND ut.role = _role
      AND ut.is_active = true
  );
END;
$function$;