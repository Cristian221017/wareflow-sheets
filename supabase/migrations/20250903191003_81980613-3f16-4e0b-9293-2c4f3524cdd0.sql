-- Corrigir políticas de segurança das tabelas restantes

-- 1. Restringir acesso às deployment_validations 
DROP POLICY IF EXISTS "Everyone can view validations" ON public.deployment_validations;

CREATE POLICY "Admins can view deployment validations" ON public.deployment_validations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.role IN ('super_admin', 'admin_transportadora')
    AND ut.is_active = true
  )
);

-- 2. A tabela feature_flags já tem políticas corretas, mas vamos garantir
-- que apenas usuários autenticados possam ver flags
-- (A política "Everyone can view feature flags" é necessária para o funcionamento do sistema)

-- 3. Corrigir função log_event que está sem search_path
CREATE OR REPLACE FUNCTION public.log_event(
  p_user_id uuid,
  p_user_role text, 
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.event_log (
    actor_id, actor_role, entity_type, entity_id, event_type, payload
  ) VALUES (
    p_user_id, p_user_role, p_entity_type, p_entity_id, p_action, p_payload
  );
END;
$function$;