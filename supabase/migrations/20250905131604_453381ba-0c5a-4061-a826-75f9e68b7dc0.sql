-- Fix the dashboard RPC to use correct table structure
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
  v_transportadora_id UUID;
  v_cliente_id UUID;
  v_user_type TEXT;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is transportadora
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = current_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NOT NULL THEN
    v_user_type := 'transportadora';
  ELSE
    -- Check if user is cliente
    SELECT uc.cliente_id INTO v_cliente_id
    FROM user_clientes uc
    WHERE uc.user_id = current_user_id
    LIMIT 1;
    
    IF v_cliente_id IS NOT NULL THEN
      v_user_type := 'cliente';
      -- Get transportadora from cliente
      SELECT c.transportadora_id INTO v_transportadora_id
      FROM clientes c
      WHERE c.id = v_cliente_id;
    ELSE
      RAISE EXCEPTION 'User has no valid transportadora or cliente links';
    END IF;
  END IF;

  IF v_user_type = 'transportadora' THEN
    RETURN QUERY
    SELECT 
      'transportadora'::TEXT as user_type,
      v_transportadora_id,
      NULL::UUID as cliente_id,
      -- Solicitações pendentes (status SOLICITADA)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = v_transportadora_id 
       AND status = 'SOLICITADA')::INTEGER as solicitacoes_pendentes,
      -- NFs armazenadas (status ARMAZENADA, mas não entregues)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = v_transportadora_id 
       AND status = 'ARMAZENADA' 
       AND (status_separacao IS NULL OR status_separacao != 'entregue'))::INTEGER as nfs_armazenadas,
      -- NFs confirmadas (status CONFIRMADA)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = v_transportadora_id 
       AND status = 'CONFIRMADA')::INTEGER as nfs_confirmadas,
      -- NFs em viagem (status CONFIRMADA with data_embarque)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = v_transportadora_id 
       AND status = 'CONFIRMADA' 
       AND data_embarque IS NOT NULL 
       AND data_entrega IS NULL)::INTEGER as nfs_em_viagem,
      -- NFs entregues (status_separacao = 'entregue' ou data_entrega preenchida)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = v_transportadora_id 
       AND (status_separacao = 'entregue' OR data_entrega IS NOT NULL))::INTEGER as nfs_entregues,
      0::INTEGER as docs_vencendo,
      0::INTEGER as docs_vencidos,
      0::DECIMAL as valor_pendente,
      0::DECIMAL as valor_vencido;

  ELSIF v_user_type = 'cliente' THEN
    RETURN QUERY
    SELECT 
      'cliente'::TEXT as user_type,
      v_transportadora_id,
      v_cliente_id,
      -- Solicitações pendentes
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = v_cliente_id 
       AND status = 'SOLICITADA')::INTEGER as solicitacoes_pendentes,
      -- NFs armazenadas (status ARMAZENADA, mas não entregues)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = v_cliente_id 
       AND status = 'ARMAZENADA'
       AND (status_separacao IS NULL OR status_separacao != 'entregue'))::INTEGER as nfs_armazenadas,
      -- NFs confirmadas
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = v_cliente_id 
       AND status = 'CONFIRMADA')::INTEGER as nfs_confirmadas,
      -- NFs em viagem
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = v_cliente_id 
       AND status = 'CONFIRMADA' 
       AND data_embarque IS NOT NULL 
       AND data_entrega IS NULL)::INTEGER as nfs_em_viagem,
      -- NFs entregues (status_separacao = 'entregue' ou data_entrega preenchida)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = v_cliente_id 
       AND (status_separacao = 'entregue' OR data_entrega IS NOT NULL))::INTEGER as nfs_entregues,
      -- Documentos financeiros
      (SELECT COUNT(*)::INTEGER FROM documentos_financeiros 
       WHERE cliente_id = v_cliente_id 
       AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::INTEGER as docs_vencendo,
      (SELECT COUNT(*)::INTEGER FROM documentos_financeiros 
       WHERE cliente_id = v_cliente_id 
       AND data_vencimento < CURRENT_DATE)::INTEGER as docs_vencidos,
      (SELECT COALESCE(SUM(valor), 0) FROM documentos_financeiros 
       WHERE cliente_id = v_cliente_id 
       AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::DECIMAL as valor_pendente,
      (SELECT COALESCE(SUM(valor), 0) FROM documentos_financeiros 
       WHERE cliente_id = v_cliente_id 
       AND data_vencimento < CURRENT_DATE)::DECIMAL as valor_vencido;
  ELSE
    RAISE EXCEPTION 'Invalid user type: %', v_user_type;
  END IF;
END;
$$;