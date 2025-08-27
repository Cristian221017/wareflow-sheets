-- Criar profile para o usuário comercial@rodoveigatransportes.com.br e estabelecer vínculo correto
DO $$
DECLARE
  v_user_id UUID := '8ce8505d-e141-4a44-8772-a6a5e8e77f40';
  v_cliente_id UUID := 'ddfd8c73-fa8b-4443-8443-28ecb82cca6c';
BEGIN
  -- Inserir profile para o cliente (se não existir)
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    v_user_id,
    'Comercial H Transportes',
    'comercial@rodoveigatransportes.com.br'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  -- Criar vínculo user_clientes (se não existir)
  INSERT INTO public.user_clientes (user_id, cliente_id)
  VALUES (v_user_id, v_cliente_id)
  ON CONFLICT (user_id, cliente_id) DO NOTHING;
  
  -- Log da operação
  INSERT INTO public.event_log (
    entity_type, event_type, message, payload, actor_id, actor_role
  ) VALUES (
    'USER', 
    'CLIENT_PROFILE_LINKED',
    'Profile do cliente criado e vinculado com sucesso',
    jsonb_build_object(
      'cliente_id', v_cliente_id,
      'user_id', v_user_id,
      'email', 'comercial@rodoveigatransportes.com.br',
      'action', 'profile_created_and_linked'
    ),
    v_user_id,
    'cliente'
  );
END $$;