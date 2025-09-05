-- Fix the dashboard RPC to consider status_separacao for accurate counting
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
AS $$
DECLARE
  current_user_id UUID;
  user_profile RECORD;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user profile
  SELECT up.role, up.transportadora_id, up.cliente_id
  INTO user_profile
  FROM user_profiles up
  WHERE up.user_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF user_profile.role = 'transportadora' THEN
    RETURN QUERY
    SELECT 
      'transportadora'::TEXT as user_type,
      user_profile.transportadora_id,
      NULL::UUID as cliente_id,
      -- Solicitações pendentes (status SOLICITADA)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = user_profile.transportadora_id 
       AND status = 'SOLICITADA')::INTEGER as solicitacoes_pendentes,
      -- NFs armazenadas (status ARMAZENADA, mas não entregues)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = user_profile.transportadora_id 
       AND status = 'ARMAZENADA' 
       AND (status_separacao IS NULL OR status_separacao != 'entregue'))::INTEGER as nfs_armazenadas,
      -- NFs confirmadas (status CONFIRMADA)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = user_profile.transportadora_id 
       AND status = 'CONFIRMADA')::INTEGER as nfs_confirmadas,
      -- NFs em viagem (status CONFIRMADA with data_embarque)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = user_profile.transportadora_id 
       AND status = 'CONFIRMADA' 
       AND data_embarque IS NOT NULL 
       AND data_entrega IS NULL)::INTEGER as nfs_em_viagem,
      -- NFs entregues (status_separacao = 'entregue' ou data_entrega preenchida)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE transportadora_id = user_profile.transportadora_id 
       AND (status_separacao = 'entregue' OR data_entrega IS NOT NULL))::INTEGER as nfs_entregues,
      0::INTEGER as docs_vencendo,
      0::INTEGER as docs_vencidos,
      0::DECIMAL as valor_pendente,
      0::DECIMAL as valor_vencido;

  ELSIF user_profile.role = 'cliente' THEN
    RETURN QUERY
    SELECT 
      'cliente'::TEXT as user_type,
      user_profile.transportadora_id,
      user_profile.cliente_id,
      -- Solicitações pendentes
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = user_profile.cliente_id 
       AND status = 'SOLICITADA')::INTEGER as solicitacoes_pendentes,
      -- NFs armazenadas (status ARMAZENADA, mas não entregues)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = user_profile.cliente_id 
       AND status = 'ARMAZENADA'
       AND (status_separacao IS NULL OR status_separacao != 'entregue'))::INTEGER as nfs_armazenadas,
      -- NFs confirmadas
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = user_profile.cliente_id 
       AND status = 'CONFIRMADA')::INTEGER as nfs_confirmadas,
      -- NFs em viagem
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = user_profile.cliente_id 
       AND status = 'CONFIRMADA' 
       AND data_embarque IS NOT NULL 
       AND data_entrega IS NULL)::INTEGER as nfs_em_viagem,
      -- NFs entregues (status_separacao = 'entregue' ou data_entrega preenchida)
      (SELECT COUNT(*)::INTEGER FROM notas_fiscais 
       WHERE cliente_id = user_profile.cliente_id 
       AND (status_separacao = 'entregue' OR data_entrega IS NOT NULL))::INTEGER as nfs_entregues,
      -- Documentos financeiros
      (SELECT COUNT(*)::INTEGER FROM documentos_financeiros 
       WHERE cliente_id = user_profile.cliente_id 
       AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::INTEGER as docs_vencendo,
      (SELECT COUNT(*)::INTEGER FROM documentos_financeiros 
       WHERE cliente_id = user_profile.cliente_id 
       AND data_vencimento < CURRENT_DATE)::INTEGER as docs_vencidos,
      (SELECT COALESCE(SUM(valor), 0) FROM documentos_financeiros 
       WHERE cliente_id = user_profile.cliente_id 
       AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::DECIMAL as valor_pendente,
      (SELECT COALESCE(SUM(valor), 0) FROM documentos_financeiros 
       WHERE cliente_id = user_profile.cliente_id 
       AND data_vencimento < CURRENT_DATE)::DECIMAL as valor_vencido;
  ELSE
    RAISE EXCEPTION 'Invalid user role: %', user_profile.role;
  END IF;
END;
$$;