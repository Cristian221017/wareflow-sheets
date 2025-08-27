-- Criar profile manual para o cliente que não foi criado pelo login
-- e estabelecer vínculo com o cliente

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_cliente_id UUID := 'ddfd8c73-fa8b-4443-8443-28ecb82cca6c';
BEGIN
  -- Inserir profile para o cliente
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    v_user_id,
    'Comercial H Transportes',
    'comercial@rodoveigatransportes.com.br'
  );

  -- Criar vínculo user_clientes
  INSERT INTO public.user_clientes (user_id, cliente_id)
  VALUES (v_user_id, v_cliente_id);
  
  -- Log da operação
  INSERT INTO public.event_log (
    entity_type, event_type, message, payload, actor_id, actor_role
  ) VALUES (
    'USER', 
    'CLIENT_LINK_CREATED',
    'Vínculo cliente criado manualmente',
    jsonb_build_object(
      'cliente_id', v_cliente_id,
      'user_id', v_user_id,
      'email', 'comercial@rodoveigatransportes.com.br',
      'created_manually', true
    ),
    v_user_id,
    'cliente'
  );
END $$;