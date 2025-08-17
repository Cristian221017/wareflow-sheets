-- Atualizar função para reconhecer emails especiais e definir roles automaticamente
CREATE OR REPLACE FUNCTION public.setup_demo_user_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transportadora_id UUID;
  v_role user_role;
  v_email TEXT;
BEGIN
  v_email := NEW.email;
  
  -- Inserir ou atualizar perfil
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  -- Determinar role baseado no email
  IF v_email = 'superadmin@sistema.com' THEN
    v_role := 'super_admin';
  ELSIF v_email = 'admin@transportadora.com' THEN
    v_role := 'admin_transportadora';
  ELSIF v_email = 'cliente@empresa.com' THEN
    v_role := 'cliente';
  ELSE
    -- Default para cliente para outros emails
    v_role := 'cliente';
  END IF;

  -- Se é super admin, associar à primeira transportadora
  IF v_role = 'super_admin' THEN
    SELECT id INTO v_transportadora_id 
    FROM public.transportadoras 
    LIMIT 1;
    
    IF v_transportadora_id IS NOT NULL THEN
      INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
      VALUES (NEW.id, v_transportadora_id, v_role, true)
      ON CONFLICT (user_id, transportadora_id) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
    END IF;
    
  -- Se é admin transportadora, associar à primeira transportadora como admin
  ELSIF v_role = 'admin_transportadora' THEN
    SELECT id INTO v_transportadora_id 
    FROM public.transportadoras 
    LIMIT 1;
    
    IF v_transportadora_id IS NOT NULL THEN
      INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
      VALUES (NEW.id, v_transportadora_id, v_role, true)
      ON CONFLICT (user_id, transportadora_id) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
    END IF;
    
  -- Para clientes, não criar entrada em user_transportadoras (eles serão gerenciados via tabela clientes)
  END IF;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar novo trigger que usa a função atualizada
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.setup_demo_user_by_email();