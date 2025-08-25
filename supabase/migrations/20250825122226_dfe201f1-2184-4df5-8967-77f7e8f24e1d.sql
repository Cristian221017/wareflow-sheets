-- Corrigir erro anterior - remover tentativa de RLS em views
-- Views não suportam RLS, apenas funções ou tabelas

-- Remover views criadas anteriormente
DROP VIEW IF EXISTS public.vw_transportadora_dashboard;
DROP VIEW IF EXISTS public.vw_cliente_dashboard;

-- Manter apenas as funções seguras para dashboards
-- Já foram criadas na migração anterior:
-- - get_transportadora_stats(p_transportadora_id UUID)
-- - get_cliente_stats(p_cliente_id UUID)

-- Criar função para obter estatísticas do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_dashboard()
RETURNS TABLE (
  user_type TEXT,
  transportadora_id UUID,
  cliente_id UUID,
  solicitacoes_pendentes BIGINT,
  nfs_armazenadas BIGINT,
  nfs_confirmadas BIGINT,
  docs_vencendo BIGINT,
  docs_vencidos BIGINT,
  valor_pendente NUMERIC,
  valor_vencido NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_transportadora UUID;
  v_user_role TEXT;
  v_cliente_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se é usuário de transportadora
  SELECT ut.transportadora_id, ut.role 
  INTO v_user_transportadora, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_user_transportadora IS NOT NULL THEN
    -- Usuário é da transportadora
    RETURN QUERY
    SELECT 
      'transportadora'::TEXT,
      v_user_transportadora,
      NULL::UUID,
      COUNT(*) FILTER (WHERE nf.status = 'SOLICITADA'),
      COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA'),
      COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA'),
      COUNT(*) FILTER (WHERE df.status = 'Em aberto' AND df.data_vencimento <= CURRENT_DATE + INTERVAL '3 days'),
      COUNT(*) FILTER (WHERE df.status = 'Vencido'),
      SUM(df.valor) FILTER (WHERE df.status = 'Em aberto'),
      SUM(df.valor) FILTER (WHERE df.status = 'Vencido')
    FROM notas_fiscais nf
    FULL OUTER JOIN documentos_financeiros df ON df.transportadora_id = nf.transportadora_id
    WHERE nf.transportadora_id = v_user_transportadora OR df.transportadora_id = v_user_transportadora;
  ELSE
    -- Verificar se é cliente
    SELECT c.id, c.transportadora_id
    INTO v_cliente_info
    FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = v_user_id AND c.status = 'ativo'
    LIMIT 1;
    
    IF v_cliente_info.id IS NOT NULL THEN
      -- Usuário é cliente
      RETURN QUERY
      SELECT 
        'cliente'::TEXT,
        v_cliente_info.transportadora_id,
        v_cliente_info.id,
        COUNT(*) FILTER (WHERE nf.status = 'SOLICITADA'),
        COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA'),
        COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA'),
        COUNT(*) FILTER (WHERE df.status = 'Em aberto'),
        COUNT(*) FILTER (WHERE df.status = 'Vencido'),
        SUM(df.valor) FILTER (WHERE df.status = 'Em aberto'),
        SUM(df.valor) FILTER (WHERE df.status = 'Vencido')
      FROM notas_fiscais nf
      FULL OUTER JOIN documentos_financeiros df ON df.cliente_id = nf.cliente_id
      WHERE nf.cliente_id = v_cliente_info.id OR df.cliente_id = v_cliente_info.id;
    ELSE
      -- Usuário não tem permissão
      RAISE EXCEPTION 'Usuário não tem permissão para acessar dashboard';
    END IF;
  END IF;
END;
$$;

-- Função para realtime centralizado (melhorar invalidação)
CREATE OR REPLACE FUNCTION public.get_realtime_stats()
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  last_update TIMESTAMP WITH TIME ZONE,
  status TEXT,
  actor_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_transportadora_id UUID;
  v_cliente_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Obter contexto do usuário
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    SELECT c.id INTO v_cliente_id
    FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = v_user_id AND c.status = 'ativo'
    LIMIT 1;
  END IF;
  
  -- Retornar eventos recentes relevantes para o usuário
  RETURN QUERY
  SELECT 
    el.entity_type,
    el.entity_id,
    el.created_at,
    COALESCE(el.payload->>'status_novo', el.payload->>'status') as status,
    el.actor_id
  FROM event_log el
  WHERE el.created_at >= NOW() - INTERVAL '1 hour'
  AND (
    -- Eventos da transportadora do usuário
    (v_transportadora_id IS NOT NULL AND (
      (el.entity_type = 'nota_fiscal' AND EXISTS (
        SELECT 1 FROM notas_fiscais nf 
        WHERE nf.id = el.entity_id AND nf.transportadora_id = v_transportadora_id
      ))
      OR
      (el.entity_type = 'documento_financeiro' AND EXISTS (
        SELECT 1 FROM documentos_financeiros df
        WHERE df.id = el.entity_id AND df.transportadora_id = v_transportadora_id
      ))
    ))
    OR
    -- Eventos do cliente
    (v_cliente_id IS NOT NULL AND (
      (el.entity_type = 'nota_fiscal' AND EXISTS (
        SELECT 1 FROM notas_fiscais nf 
        WHERE nf.id = el.entity_id AND nf.cliente_id = v_cliente_id
      ))
      OR
      (el.entity_type = 'documento_financeiro' AND EXISTS (
        SELECT 1 FROM documentos_financeiros df
        WHERE df.id = el.entity_id AND df.cliente_id = v_cliente_id
      ))
    ))
  )
  ORDER BY el.created_at DESC
  LIMIT 50;
END;
$$;