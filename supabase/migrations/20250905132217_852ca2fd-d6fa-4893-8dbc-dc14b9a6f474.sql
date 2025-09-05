-- Fix ambiguous column references in dashboard RPC
DROP FUNCTION IF EXISTS get_current_user_dashboard();

CREATE OR REPLACE FUNCTION get_current_user_dashboard()
RETURNS TABLE (
  user_type TEXT,
  transportadora_id UUID,
  cliente_id UUID,
  solicitacoes_pendentes INTEGER,
  nfs_armazenadas INTEGER,
  nfs_confirmadas INTEGER,
  nfs_em_viagem INTEGER,
  nfs_entregues INTEGER,
  docs_vencendo INTEGER,
  docs_vencidos INTEGER,
  valor_pendente DECIMAL,
  valor_vencido DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_transportadora_id UUID;
  user_cliente_id UUID;
  user_role_name TEXT;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user has transportadora link
  SELECT ut.transportadora_id, ut.role INTO user_transportadora_id, user_role_name
  FROM user_transportadoras ut
  WHERE ut.user_id = current_user_id AND ut.is_active = true
  LIMIT 1;

  -- Check if user has cliente link
  SELECT uc.cliente_id INTO user_cliente_id
  FROM user_clientes uc
  WHERE uc.user_id = current_user_id
  LIMIT 1;

  -- Determine user type and return appropriate data
  IF user_transportadora_id IS NOT NULL THEN
    -- User is transportadora
    RETURN QUERY
    SELECT 
      'transportadora'::TEXT,
      user_transportadora_id,
      NULL::UUID,
      -- Solicitações pendentes (status SOLICITADA)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.transportadora_id = user_transportadora_id 
       AND nf.status = 'SOLICITADA')::INTEGER,
      -- NFs armazenadas (status ARMAZENADA, mas não entregues)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.transportadora_id = user_transportadora_id 
       AND nf.status = 'ARMAZENADA' 
       AND (nf.status_separacao IS NULL OR nf.status_separacao != 'entregue'))::INTEGER,
      -- NFs confirmadas (status CONFIRMADA)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.transportadora_id = user_transportadora_id 
       AND nf.status = 'CONFIRMADA')::INTEGER,
      -- NFs em viagem (status CONFIRMADA with data_embarque)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.transportadora_id = user_transportadora_id 
       AND nf.status = 'CONFIRMADA' 
       AND nf.data_embarque IS NOT NULL 
       AND nf.data_entrega IS NULL)::INTEGER,
      -- NFs entregues (status_separacao = 'entregue' ou data_entrega preenchida)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.transportadora_id = user_transportadora_id 
       AND (nf.status_separacao = 'entregue' OR nf.data_entrega IS NOT NULL))::INTEGER,
      0::INTEGER,
      0::INTEGER,
      0::DECIMAL,
      0::DECIMAL;

  ELSIF user_cliente_id IS NOT NULL THEN
    -- User is cliente
    RETURN QUERY
    SELECT 
      'cliente'::TEXT,
      (SELECT c.transportadora_id FROM clientes c WHERE c.id = user_cliente_id),
      user_cliente_id,
      -- Solicitações pendentes
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.cliente_id = user_cliente_id 
       AND nf.status = 'SOLICITADA')::INTEGER,
      -- NFs armazenadas (status ARMAZENADA, mas não entregues)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.cliente_id = user_cliente_id 
       AND nf.status = 'ARMAZENADA'
       AND (nf.status_separacao IS NULL OR nf.status_separacao != 'entregue'))::INTEGER,
      -- NFs confirmadas
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.cliente_id = user_cliente_id 
       AND nf.status = 'CONFIRMADA')::INTEGER,
      -- NFs em viagem
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.cliente_id = user_cliente_id 
       AND nf.status = 'CONFIRMADA' 
       AND nf.data_embarque IS NOT NULL 
       AND nf.data_entrega IS NULL)::INTEGER,
      -- NFs entregues (status_separacao = 'entregue' ou data_entrega preenchida)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais nf
       WHERE nf.cliente_id = user_cliente_id 
       AND (nf.status_separacao = 'entregue' OR nf.data_entrega IS NOT NULL))::INTEGER,
      -- Documentos financeiros
      (SELECT COUNT(*)::INTEGER FROM documentos_financeiros df
       WHERE df.cliente_id = user_cliente_id 
       AND df.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::INTEGER,
      (SELECT COUNT(*)::INTEGER FROM documentos_financeiros df
       WHERE df.cliente_id = user_cliente_id 
       AND df.data_vencimento < CURRENT_DATE)::INTEGER,
      (SELECT COALESCE(SUM(df.valor), 0) FROM documentos_financeiros df
       WHERE df.cliente_id = user_cliente_id 
       AND df.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::DECIMAL,
      (SELECT COALESCE(SUM(df.valor), 0) FROM documentos_financeiros df
       WHERE df.cliente_id = user_cliente_id 
       AND df.data_vencimento < CURRENT_DATE)::DECIMAL;
  ELSE
    RAISE EXCEPTION 'User has no valid links to transportadora or cliente';
  END IF;
END;
$$;