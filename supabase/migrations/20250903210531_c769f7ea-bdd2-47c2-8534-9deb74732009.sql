-- Create function to get clientes for current user's transportadora
CREATE OR REPLACE FUNCTION public.get_clientes_for_user()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  cnpj text,
  razao_social text,
  transportadora_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transportadora_id uuid;
BEGIN
  -- Get user's transportadora
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
  LIMIT 1;
  
  -- If no transportadora found, return empty
  IF v_transportadora_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return clientes for the transportadora
  RETURN QUERY
  SELECT 
    c.id,
    c.razao_social as name,
    c.email,
    c.cnpj,
    c.razao_social,
    c.transportadora_id
  FROM clientes c
  WHERE c.transportadora_id = v_transportadora_id
    AND c.status = 'ativo'
  ORDER BY c.razao_social;
END;
$function$;