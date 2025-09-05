-- Adicionar tipos para funções RPC que estão sendo usadas mas não estão nos tipos TypeScript

-- Verificar se as funções existem (já existem, só precisamos dos tipos)
COMMENT ON FUNCTION public.create_user_cliente_link IS 'Cria vínculo entre usuário e cliente - já existe';
COMMENT ON FUNCTION public.create_user_cliente_link_by_email IS 'Cria vínculo entre usuário e cliente por email - já existe';
COMMENT ON FUNCTION public.set_default_client_permissions IS 'Define permissões padrão para clientes - já existe';

-- Garantir que o trigger está funcionando
SELECT EXISTS(
  SELECT 1 FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_set_default_client_permissions' 
  AND event_object_table = 'profiles'
);

-- Verificar estrutura da tabela profiles
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public' 
ORDER BY ordinal_position;