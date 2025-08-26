-- Função para criar vínculos seguros entre usuários e clientes
CREATE OR REPLACE FUNCTION public.create_user_cliente_link(p_user_id uuid, p_cliente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se o vínculo já existe
  IF EXISTS (
    SELECT 1 FROM public.user_clientes 
    WHERE user_id = p_user_id AND cliente_id = p_cliente_id
  ) THEN
    RETURN true; -- Já existe, considerar sucesso
  END IF;

  -- Criar o vínculo
  INSERT INTO public.user_clientes (user_id, cliente_id)
  VALUES (p_user_id, p_cliente_id);
  
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN true; -- Já existe, considerar sucesso
  WHEN OTHERS THEN
    RETURN false; -- Falhou por outro motivo
END;
$function$;

-- Função para buscar informações dos vínculos user_clientes
CREATE OR REPLACE FUNCTION public.get_user_clientes_info()
RETURNS TABLE(
  user_id uuid,
  cliente_id uuid,
  user_email text,
  user_name text,
  cliente_email text,
  cliente_nome text,
  cliente_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.cliente_id,
    p.email as user_email,
    p.name as user_name,
    c.email as cliente_email,
    c.razao_social as cliente_nome,
    c.status as cliente_status
  FROM public.user_clientes uc
  LEFT JOIN public.profiles p ON p.user_id = uc.user_id
  LEFT JOIN public.clientes c ON c.id = uc.cliente_id;
END;
$function$;