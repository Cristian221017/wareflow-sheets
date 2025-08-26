-- Permitir que usuários autenticados executem a função de vínculo
GRANT EXECUTE ON FUNCTION public.create_user_cliente_link(uuid, uuid) TO authenticated;