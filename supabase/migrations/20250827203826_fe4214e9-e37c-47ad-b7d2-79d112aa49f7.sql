-- Última correção: Encontrar e corrigir função restante sem search_path

-- Vou verificar se há alguma função que ainda não foi corrigida
-- Verificando algumas possíveis funções que podem estar faltando

-- Verificar se prevent_orphaned_profiles precisa de correção
CREATE OR REPLACE FUNCTION public.prevent_orphaned_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Aguardar 1 segundo para permitir que vínculos sejam criados
  PERFORM pg_sleep(1);
  
  -- Verificar se o usuário tem vínculos válidos
  IF NOT public.validate_user_has_links(NEW.user_id) THEN
    -- Log do bloqueio
    INSERT INTO event_log (
      entity_type, event_type, message, payload, actor_id, actor_role
    ) VALUES (
      'SECURITY', 
      'ORPHANED_USER_BLOCKED',
      'Bloqueada criação de usuário órfão sem vínculos válidos',
      jsonb_build_object(
        'blocked_email', NEW.email,
        'blocked_user_id', NEW.user_id,
        'reason', 'no_valid_links_found'
      ),
      NEW.user_id,
      'system'
    );
    
    RAISE EXCEPTION 'Usuário não pode ser criado sem vínculos válidos com transportadora ou cliente';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Verificar função de limpeza de usuários órfãos
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_users()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  removed_count integer := 0;
BEGIN
  -- Contar usuários órfãos antes de remover
  SELECT COUNT(*) INTO removed_count
  FROM profiles p
  LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
  WHERE ut.user_id IS NULL AND uc.user_id IS NULL
    AND p.created_at < now() - interval '5 minutes'; -- Só remove após 5 minutos
  
  -- Remover usuários órfãos antigos
  DELETE FROM profiles 
  WHERE user_id IN (
    SELECT p.user_id
    FROM profiles p
    LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
    LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
    WHERE ut.user_id IS NULL AND uc.user_id IS NULL
      AND p.created_at < now() - interval '5 minutes'
  );
  
  -- Log da limpeza se removeu algo
  IF removed_count > 0 THEN
    INSERT INTO event_log (
      entity_type, event_type, message, payload, actor_id, actor_role
    ) VALUES (
      'MAINTENANCE', 
      'ORPHANED_CLEANUP',
      'Limpeza automática executada',
      jsonb_build_object(
        'removed_users', removed_count,
        'cleanup_time', now()
      ),
      (SELECT user_id FROM user_transportadoras WHERE role = 'super_admin' LIMIT 1),
      'system'
    );
  END IF;
  
  RETURN removed_count;
END;
$function$;