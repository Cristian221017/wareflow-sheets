-- CORREÇÃO CRÍTICA: Criar vínculos user_clientes para sistema funcionar

-- 1. Criar vínculos baseados em email matching
INSERT INTO public.user_clientes (user_id, cliente_id)
SELECT DISTINCT p.user_id, c.id 
FROM public.profiles p
JOIN public.clientes c ON LOWER(TRIM(c.email)) = LOWER(TRIM(p.email))
WHERE c.status = 'ativo'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_clientes uc 
    WHERE uc.user_id = p.user_id AND uc.cliente_id = c.id
  );

-- 2. Criar função para vincular clientes automaticamente
CREATE OR REPLACE FUNCTION public.create_user_cliente_link_by_email(p_client_email text)
RETURNS boolean
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id uuid;
  v_cliente_id uuid;
BEGIN
  -- Buscar user_id pelo email
  SELECT user_id INTO v_user_id 
  FROM public.profiles 
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_client_email));
  
  -- Buscar cliente_id pelo email
  SELECT id INTO v_cliente_id 
  FROM public.clientes 
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_client_email)) 
  AND status = 'ativo';
  
  -- Se ambos existem, criar vínculo
  IF v_user_id IS NOT NULL AND v_cliente_id IS NOT NULL THEN
    INSERT INTO public.user_clientes (user_id, cliente_id)
    VALUES (v_user_id, v_cliente_id)
    ON CONFLICT (user_id, cliente_id) DO NOTHING;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 3. Função para auto-vinculação em novos signups
CREATE OR REPLACE FUNCTION public.auto_link_new_user()
RETURNS trigger
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Tentar criar vínculo automaticamente
  PERFORM public.create_user_cliente_link_by_email(NEW.email);
  RETURN NEW;
END;
$$;

-- 4. Trigger para executar auto-vinculação
DROP TRIGGER IF EXISTS trigger_auto_link_user ON public.profiles;
CREATE TRIGGER trigger_auto_link_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_new_user();

-- 5. Verificar resultados
SELECT 'VÍNCULOS CRIADOS' as status, COUNT(*) as total 
FROM public.user_clientes;