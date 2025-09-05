-- Atualizar permissões do cliente existente para admin
UPDATE public.profiles 
SET permissions = '{"users": {"create": true, "edit": true, "delete": true}}'::jsonb
WHERE email = 'comercial@rodoveigatransportes.com.br';

-- Também atualizar permissões padrão para novos clientes automaticamente criados pela transportadora
-- Criar trigger que define permissões de admin para clientes cadastrados pela transportadora
CREATE OR REPLACE FUNCTION public.set_default_client_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não tem permissões definidas e é um cliente (verificando se existe na tabela clientes)
  IF NEW.permissions IS NULL AND EXISTS (
    SELECT 1 FROM public.clientes c WHERE c.email = NEW.email
  ) THEN
    NEW.permissions = '{"users": {"create": true, "edit": true, "delete": true}}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger apenas em INSERT (para novos usuários)
DROP TRIGGER IF EXISTS trigger_set_default_client_permissions ON public.profiles;
CREATE TRIGGER trigger_set_default_client_permissions
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_client_permissions();

-- Comentários para documentação
COMMENT ON FUNCTION public.set_default_client_permissions IS 'Define permissões de admin automaticamente para clientes cadastrados pela transportadora';