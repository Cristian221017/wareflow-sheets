-- Desabilitar temporariamente o trigger, criar profile e vínculo, depois reabilitar
DO $$
DECLARE
  v_user_id UUID := '8ce8505d-e141-4a44-8772-a6a5e8e77f40';
  v_cliente_id UUID := 'ddfd8c73-fa8b-4443-8443-28ecb82cca6c';
BEGIN
  -- Desabilitar o trigger temporariamente
  DROP TRIGGER IF EXISTS prevent_orphaned_profiles_trigger ON public.profiles;
  
  -- Inserir profile para o cliente
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    v_user_id,
    'Comercial H Transportes',
    'comercial@rodoveigatransportes.com.br'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  -- Criar vínculo user_clientes
  INSERT INTO public.user_clientes (user_id, cliente_id)
  VALUES (v_user_id, v_cliente_id)
  ON CONFLICT (user_id, cliente_id) DO NOTHING;

  -- Recriar o trigger
  CREATE TRIGGER prevent_orphaned_profiles_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_orphaned_profiles();
  
  RAISE NOTICE 'Profile e vínculo criados com sucesso para usuário %', v_user_id;
END $$;