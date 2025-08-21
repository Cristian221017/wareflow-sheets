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

-- Testar se o cliente agora consegue acessar as notas fiscais
SELECT 
  nf.numero_nf,
  nf.produto,
  c.razao_social as cliente_nome
FROM notas_fiscais nf
JOIN clientes c ON c.id = nf.cliente_id
WHERE nf.transportadora_id = get_cliente_transportadora('8ce8505d-e141-4a44-8772-a6a5e8e77f40');