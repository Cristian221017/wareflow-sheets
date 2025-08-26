-- Criar função RPC para inserir logs (contorna problemas de tipagem)
CREATE OR REPLACE FUNCTION public.log_event(
  p_level text,
  p_message text DEFAULT '',
  p_entity_type text DEFAULT 'SYSTEM', 
  p_action text DEFAULT 'LOG',
  p_meta jsonb DEFAULT '{}'
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Pegar user ID atual se autenticado
  v_user_id := auth.uid();
  
  INSERT INTO public.event_log (
    level, message, entity_type, event_type, payload, 
    actor_id, entity_id, actor_role, correlation_id
  ) VALUES (
    p_level, p_message, p_entity_type, p_action, p_meta,
    v_user_id, gen_random_uuid(), 'user', gen_random_uuid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;