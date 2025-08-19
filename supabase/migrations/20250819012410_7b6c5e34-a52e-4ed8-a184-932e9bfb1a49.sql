-- Corrigir search_path das funções existentes
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_transportadoras ut
    WHERE ut.user_id = _user_id
      AND ut.role = _role
      AND ut.is_active = true
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_transportadora(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ut.transportadora_id
  FROM public.user_transportadoras ut
  WHERE ut.user_id = _user_id
    AND ut.is_active = true
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.setup_demo_user_by_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;