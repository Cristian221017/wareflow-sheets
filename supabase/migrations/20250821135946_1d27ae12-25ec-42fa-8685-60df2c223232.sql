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

-- Função para identificar transportadora do cliente logado
CREATE OR REPLACE FUNCTION get_cliente_transportadora(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Primeiro tenta buscar como usuário normal
  SELECT ut.transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = _user_id
    AND ut.is_active = true
  LIMIT 1
  
  UNION ALL
  
  -- Se não encontrar, busca como cliente
  SELECT c.transportadora_id
  FROM clientes c
  JOIN profiles p ON p.email = c.email
  WHERE p.user_id = _user_id
    AND c.status = 'ativo'
  LIMIT 1
$$;

-- Atualizar políticas RLS para usar a nova função
DROP POLICY IF EXISTS "Users can view notas fiscais from their transportadora" ON notas_fiscais;
CREATE POLICY "Users can view notas fiscais from their transportadora" 
ON public.notas_fiscais 
FOR SELECT 
USING (
  transportadora_id = get_cliente_transportadora(auth.uid()) OR
  EXISTS (
    SELECT 1 
    FROM clientes c 
    WHERE c.id = notas_fiscais.cliente_id 
    AND c.email = (
      SELECT profiles.email 
      FROM profiles 
      WHERE profiles.user_id = auth.uid()
    )
    AND c.status = 'ativo'
  )
);

DROP POLICY IF EXISTS "Users can view pedidos liberacao from their transportadora" ON pedidos_liberacao;
CREATE POLICY "Users can view pedidos liberacao from their transportadora" 
ON public.pedidos_liberacao 
FOR SELECT 
USING (
  transportadora_id = get_cliente_transportadora(auth.uid()) OR
  EXISTS (
    SELECT 1 
    FROM clientes c 
    WHERE c.id = pedidos_liberacao.cliente_id 
    AND c.email = (
      SELECT profiles.email 
      FROM profiles 
      WHERE profiles.user_id = auth.uid()
    )
    AND c.status = 'ativo'
  )
);

DROP POLICY IF EXISTS "Users can view pedidos liberados from their transportadora" ON pedidos_liberados;
CREATE POLICY "Users can view pedidos liberados from their transportadora" 
ON public.pedidos_liberados 
FOR SELECT 
USING (
  transportadora_id = get_cliente_transportadora(auth.uid()) OR
  EXISTS (
    SELECT 1 
    FROM clientes c 
    WHERE c.id = pedidos_liberados.cliente_id 
    AND c.email = (
      SELECT profiles.email 
      FROM profiles 
      WHERE profiles.user_id = auth.uid()
    )
    AND c.status = 'ativo'
  )
);