-- Corrigir case sensitivity no email do cliente
UPDATE clientes 
SET email = LOWER(email) 
WHERE id = 'ef2ed1bd-578a-4281-9198-0a17e311cf32';

-- Criar política RLS para clientes visualizarem suas próprias notas fiscais
CREATE POLICY "Clientes podem visualizar suas próprias notas fiscais" 
ON public.notas_fiscais 
FOR SELECT 
USING (
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

-- Criar política RLS para clientes visualizarem seus próprios pedidos de liberação
CREATE POLICY "Clientes podem visualizar seus próprios pedidos de liberação" 
ON public.pedidos_liberacao 
FOR SELECT 
USING (
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

-- Criar política RLS para clientes visualizarem seus próprios pedidos liberados
CREATE POLICY "Clientes podem visualizar seus próprios pedidos liberados" 
ON public.pedidos_liberados 
FOR SELECT 
USING (
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

-- Criar política para clientes criarem pedidos de liberação
CREATE POLICY "Clientes podem criar pedidos de liberação para suas notas fiscais" 
ON public.pedidos_liberacao 
FOR INSERT 
WITH CHECK (
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