-- CORREÇÃO CRÍTICA: Configurar super admin corretamente
-- 1. Buscar primeira transportadora para associar ao super admin
DO $$
DECLARE
  v_transportadora_id UUID;
  v_user_id UUID := '26b27800-5041-4572-80de-6e9f17a05231';
BEGIN
  -- Buscar primeira transportadora
  SELECT id INTO v_transportadora_id FROM public.transportadoras LIMIT 1;
  
  -- Se existe transportadora, inserir associação
  IF v_transportadora_id IS NOT NULL THEN
    INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
    VALUES (v_user_id, v_transportadora_id, 'super_admin', true)
    ON CONFLICT (user_id, transportadora_id) 
    DO UPDATE SET 
      role = 'super_admin',
      is_active = true;
      
    RAISE NOTICE 'Super admin configurado com sucesso para transportadora %', v_transportadora_id;
  ELSE
    RAISE NOTICE 'Nenhuma transportadora encontrada para associar';
  END IF;
END $$;