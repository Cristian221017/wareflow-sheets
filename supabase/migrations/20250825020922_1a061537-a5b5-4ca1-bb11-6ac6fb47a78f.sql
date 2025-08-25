-- Update the trigger to recognize the new super admin email
CREATE OR REPLACE FUNCTION public.setup_demo_user_by_email()
RETURNS trigger
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
  
  -- Insert or update profile
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

  -- Determine role based on email or if there's a transportadora with this email
  IF v_email = 'superadmin@sistema.com' OR v_email = 'Crisrd2608@gmail.com' THEN
    v_role := 'super_admin';
    -- Associate with first transportadora
    SELECT id INTO v_transportadora_id 
    FROM public.transportadoras 
    LIMIT 1;
  ELSIF v_email = 'admin@transportadora.com' THEN
    v_role := 'admin_transportadora';
    SELECT id INTO v_transportadora_id 
    FROM public.transportadoras 
    LIMIT 1;
  ELSIF v_email = 'cliente@empresa.com' THEN
    v_role := 'cliente';
    RETURN NEW; -- Don't create user_transportadoras entry for test client
  ELSE
    -- Check if this email corresponds to a transportadora admin
    SELECT id INTO v_transportadora_id 
    FROM public.transportadoras 
    WHERE email = v_email;
    
    IF v_transportadora_id IS NOT NULL THEN
      v_role := 'admin_transportadora';
    ELSE
      -- Default to cliente for unknown emails
      v_role := 'cliente';
      RETURN NEW; -- Don't create user_transportadoras entry for clients
    END IF;
  END IF;

  -- Create user_transportadoras association if we have a transportadora
  IF v_transportadora_id IS NOT NULL THEN
    INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
    VALUES (NEW.id, v_transportadora_id, v_role, true)
    ON CONFLICT (user_id, transportadora_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active;
  END IF;

  RETURN NEW;
END;
$$;