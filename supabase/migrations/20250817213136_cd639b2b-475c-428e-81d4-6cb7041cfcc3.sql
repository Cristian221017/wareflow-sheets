-- Criar usuários demo no sistema de autenticação
-- Nota: Esta é uma simulação da estrutura, os usuários reais precisam ser criados via interface do Supabase

-- Primeiro, vamos criar uma função para inserir usuários demo após eles serem criados no auth
CREATE OR REPLACE FUNCTION public.setup_demo_user(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role public.user_role,
  transportadora_cnpj TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transportadora_id UUID;
BEGIN
  -- Inserir ou atualizar perfil
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (user_id, user_name, user_email)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  -- Se é super admin, não precisa de transportadora
  IF user_role = 'super_admin' THEN
    INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
    SELECT user_id, id, user_role, true
    FROM public.transportadoras
    LIMIT 1
    ON CONFLICT (user_id, transportadora_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active;
    RETURN;
  END IF;

  -- Para outros tipos, buscar transportadora pelo CNPJ
  IF transportadora_cnpj IS NOT NULL THEN
    SELECT id INTO v_transportadora_id 
    FROM public.transportadoras 
    WHERE cnpj = transportadora_cnpj;
    
    IF v_transportadora_id IS NOT NULL THEN
      INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
      VALUES (user_id, v_transportadora_id, user_role, true)
      ON CONFLICT (user_id, transportadora_id) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
    END IF;
  END IF;
END;
$$;