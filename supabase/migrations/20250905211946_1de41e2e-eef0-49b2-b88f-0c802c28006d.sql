-- Adicionar campos de permissões aos usuários
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"users": {"create": false, "edit": false, "delete": false}}'::jsonb;

-- Função para verificar se um usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission_path text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_permissions jsonb;
  current_permission jsonb;
  path_element text;
BEGIN
  -- Buscar permissões do usuário
  SELECT permissions INTO user_permissions
  FROM profiles
  WHERE user_id = _user_id;
  
  -- Se não tem permissões definidas, retorna false
  IF user_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Navegar pelo path das permissões
  current_permission := user_permissions;
  FOREACH path_element IN ARRAY _permission_path
  LOOP
    current_permission := current_permission -> path_element;
    IF current_permission IS NULL THEN
      RETURN false;
    END IF;
  END LOOP;
  
  -- Verificar se o valor final é true
  RETURN (current_permission)::boolean;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.permissions IS 'Permissões específicas do usuário em formato JSON: {"users": {"create": boolean, "edit": boolean, "delete": boolean}}';
COMMENT ON FUNCTION public.user_has_permission IS 'Verifica se um usuário possui uma permissão específica seguindo um caminho no JSON de permissões';