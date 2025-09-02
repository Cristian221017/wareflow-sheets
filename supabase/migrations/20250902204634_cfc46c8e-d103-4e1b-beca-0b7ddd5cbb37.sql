-- Primeiro, vamos verificar se há problemas de vinculação entre clientes e transportadoras
-- Função para verificar e corrigir vínculos de clientes

-- Verificar clientes que podem estar sem transportadora vinculada corretamente
WITH problematic_clients AS (
  SELECT DISTINCT 
    c.id as cliente_id,
    c.email,
    c.razao_social,
    c.transportadora_id,
    uc.user_id,
    ut.transportadora_id as user_transportadora_id,
    ut.role as user_role
  FROM clientes c
  LEFT JOIN user_clientes uc ON uc.cliente_id = c.id
  LEFT JOIN user_transportadoras ut ON ut.user_id = uc.user_id
  WHERE c.status = 'ativo'
  AND (
    -- Casos problemáticos:
    -- 1. Cliente sem user_id vinculado mas com email que existe em profiles
    (uc.user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.email = c.email))
    OR
    -- 2. Cliente com user_id que tem role de transportadora diferente do cliente
    (uc.user_id IS NOT NULL AND ut.transportadora_id IS NOT NULL AND ut.transportadora_id != c.transportadora_id)
    OR  
    -- 3. Cliente com email que corresponde a um user_transportadoras mas sem vínculo user_clientes
    (uc.user_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles p 
      JOIN user_transportadoras ut2 ON ut2.user_id = p.user_id
      WHERE p.email = c.email AND ut2.transportadora_id = c.transportadora_id
    ))
  )
)
SELECT * FROM problematic_clients;

-- Criar função para corrigir vínculos automaticamente
CREATE OR REPLACE FUNCTION public.fix_client_transportadora_links()
RETURNS TABLE(action_taken text, cliente_id uuid, cliente_email text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record RECORD;
  user_record RECORD;
  action_log jsonb := '[]'::jsonb;
  temp_action jsonb;
BEGIN
  -- Corrigir clientes que têm email correspondente em profiles mas sem vínculo user_clientes
  FOR client_record IN 
    SELECT DISTINCT c.id, c.email, c.razao_social, c.transportadora_id
    FROM clientes c
    WHERE c.status = 'ativo'
    AND NOT EXISTS (SELECT 1 FROM user_clientes uc WHERE uc.cliente_id = c.id)
    AND EXISTS (SELECT 1 FROM profiles p WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(c.email)))
  LOOP
    -- Buscar o user_id correspondente
    SELECT p.user_id INTO user_record
    FROM profiles p 
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(client_record.email))
    LIMIT 1;
    
    IF user_record.user_id IS NOT NULL THEN
      -- Criar vínculo user_clientes se não existe
      INSERT INTO user_clientes (user_id, cliente_id)
      VALUES (user_record.user_id, client_record.id)
      ON CONFLICT (user_id, cliente_id) DO NOTHING;
      
      temp_action := jsonb_build_object(
        'action', 'created_user_cliente_link',
        'cliente_id', client_record.id,
        'cliente_email', client_record.email,
        'user_id', user_record.user_id
      );
      
      RETURN QUERY SELECT 
        'created_user_cliente_link'::text,
        client_record.id,
        client_record.email,
        temp_action;
    END IF;
  END LOOP;
  
  -- Log final
  PERFORM log_system_event(
    'MAINTENANCE', 'CLIENT_LINKS_FIXED', 'INFO',
    'Vínculos entre clientes e usuários corrigidos automaticamente',
    NULL, NULL, NULL,
    jsonb_build_object('fixed_at', now())
  );
  
END;
$$;

-- Executar a correção
SELECT * FROM public.fix_client_transportadora_links();

-- Atualizar as RLS policies para clientes para garantir escopo correto por transportadora

-- Policy mais específica para visualização de clientes por transportadora
DROP POLICY IF EXISTS "Users can view clientes from their transportadora" ON clientes;
CREATE POLICY "Users can view clientes from their transportadora" 
ON clientes 
FOR SELECT 
USING (
  -- Super admins podem ver todos
  has_role(auth.uid(), 'super_admin'::user_role) 
  OR
  -- Usuários de transportadora podem ver clientes da sua transportadora
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = clientes.transportadora_id
  ))
  OR  
  -- Clientes podem ver seus próprios dados
  (EXISTS (
    SELECT 1 FROM user_clientes uc
    WHERE uc.user_id = auth.uid() 
    AND uc.cliente_id = clientes.id
  ))
);

-- Policy mais específica para gerenciamento de clientes por admins da transportadora
DROP POLICY IF EXISTS "Admin and operadores can manage clientes from their transportad" ON clientes;
CREATE POLICY "Admin and operadores can manage clientes from their transportadora" 
ON clientes 
FOR ALL 
USING (
  -- Super admins podem gerenciar todos
  has_role(auth.uid(), 'super_admin'::user_role)
  OR
  -- Admins e operadores podem gerenciar clientes de sua transportadora
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = clientes.transportadora_id
    AND ut.role IN ('admin_transportadora', 'operador')
  ))
)
WITH CHECK (
  -- Super admins podem inserir/atualizar qualquer cliente
  has_role(auth.uid(), 'super_admin'::user_role)
  OR
  -- Outros usuários só podem inserir/atualizar clientes de sua transportadora
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = clientes.transportadora_id
    AND ut.role IN ('admin_transportadora', 'operador')
  ))
);

-- Garantir que documentos financeiros sejam filtrados por transportadora corretamente
DROP POLICY IF EXISTS "Admin e operadores podem gerenciar documentos de sua transporta" ON documentos_financeiros;
CREATE POLICY "Admin e operadores podem gerenciar documentos de sua transportadora" 
ON documentos_financeiros 
FOR ALL 
USING (
  -- Super admins podem gerenciar todos
  has_role(auth.uid(), 'super_admin'::user_role)
  OR
  -- Usuários da transportadora podem gerenciar documentos de sua transportadora
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = documentos_financeiros.transportadora_id
    AND ut.role IN ('admin_transportadora', 'operador')
  ))
)
WITH CHECK (
  -- Garantir que novos documentos sejam sempre da transportadora do usuário
  has_role(auth.uid(), 'super_admin'::user_role)
  OR
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = documentos_financeiros.transportadora_id
    AND ut.role IN ('admin_transportadora', 'operador')
  ))
);

-- Garantir que notas fiscais sejam filtradas corretamente
DROP POLICY IF EXISTS "Admin and operadores can manage notas fiscais from their transp" ON notas_fiscais;
CREATE POLICY "Admin and operadores can manage notas fiscais from their transportadora" 
ON notas_fiscais 
FOR ALL 
USING (
  -- Super admins podem gerenciar todas
  has_role(auth.uid(), 'super_admin'::user_role)
  OR
  -- Usuários da transportadora podem gerenciar NFs de sua transportadora  
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = notas_fiscais.transportadora_id
    AND ut.role IN ('admin_transportadora', 'operador')
  ))
)
WITH CHECK (
  -- Garantir que novas NFs sejam sempre da transportadora do usuário
  has_role(auth.uid(), 'super_admin'::user_role)
  OR
  (EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = notas_fiscais.transportadora_id
    AND ut.role IN ('admin_transportadora', 'operador')
  ))
);