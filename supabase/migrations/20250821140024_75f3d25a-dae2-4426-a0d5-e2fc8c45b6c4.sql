-- Criar entrada na user_transportadoras para o cliente
INSERT INTO user_transportadoras (user_id, transportadora_id, role, is_active)
SELECT 
  '8ce8505d-e141-4a44-8772-a6a5e8e77f40',
  c.transportadora_id,
  'cliente'::user_role,
  true
FROM clientes c 
WHERE c.email = 'comercial@rodoveigatransportes.com.br'
ON CONFLICT (user_id, transportadora_id) DO NOTHING;

-- Função corrigida para identificar transportadora do cliente logado
CREATE OR REPLACE FUNCTION get_cliente_transportadora(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transportadora_id_result uuid;
BEGIN
  -- Primeiro tenta buscar como usuário normal
  SELECT ut.transportadora_id INTO transportadora_id_result
  FROM user_transportadoras ut
  WHERE ut.user_id = _user_id
    AND ut.is_active = true
  LIMIT 1;
  
  -- Se não encontrou, busca como cliente
  IF transportadora_id_result IS NULL THEN
    SELECT c.transportadora_id INTO transportadora_id_result
    FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = _user_id
      AND c.status = 'ativo'
    LIMIT 1;
  END IF;
  
  RETURN transportadora_id_result;
END;
$$;