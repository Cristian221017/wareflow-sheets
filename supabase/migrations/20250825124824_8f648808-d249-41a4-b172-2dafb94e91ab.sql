-- Atualizar função nf_solicitar para incluir logs
CREATE OR REPLACE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF e role do usuário
  SELECT status, numero_nf, cliente_id, transportadora_id 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    -- Log do erro
    PERFORM log_system_event(
      'NF', 'NF_SOLICITAR_ERROR', 'ERROR',
      'Tentativa de solicitar NF inexistente',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id)
    );
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Determinar role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  -- Executar transição
  UPDATE public.notas_fiscais
  SET status = 'SOLICITADA',
      requested_by = p_user_id,
      requested_at = now(),
      approved_by = null,
      approved_at = null,
      updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'ARMAZENADA';
    
  IF NOT FOUND THEN
    -- Log do erro de transição inválida
    PERFORM log_system_event(
      'NF', 'NF_SOLICITAR_INVALID_TRANSITION', 'WARN',
      'Tentativa de solicitar NF com status inválido',
      p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
      jsonb_build_object(
        'nf_numero', v_nf_info.numero_nf,
        'status_atual', v_nf_info.status,
        'tentativa_transicao_para', 'SOLICITADA'
      )
    );
    RAISE EXCEPTION 'Transição inválida: só é possível SOLICITAR quando status é ARMAZENADA';
  END IF;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'NF_SOLICITADA', 'INFO',
    'NF solicitada para carregamento com sucesso',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'ARMAZENADA',
      'status_novo', 'SOLICITADA'
    )
  );
  
  -- Log do evento original (manter compatibilidade)
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'solicitacao_carregamento',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'ARMAZENADA',
      'status_novo', 'SOLICITADA',
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id
    )
  );
END;
$$;

-- Atualizar função nf_confirmar para incluir logs
CREATE OR REPLACE FUNCTION public.nf_confirmar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF e role do usuário
  SELECT status, numero_nf, cliente_id, transportadora_id, requested_by 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'NF_CONFIRMAR_ERROR', 'ERROR',
      'Tentativa de confirmar NF inexistente',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id)
    );
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Determinar role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  -- Executar transição
  UPDATE public.notas_fiscais
  SET status = 'CONFIRMADA',
      approved_by = p_user_id,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'SOLICITADA';
    
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'NF_CONFIRMAR_INVALID_TRANSITION', 'WARN',
      'Tentativa de confirmar NF com status inválido',
      p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
      jsonb_build_object(
        'nf_numero', v_nf_info.numero_nf,
        'status_atual', v_nf_info.status,
        'tentativa_transicao_para', 'CONFIRMADA'
      )
    );
    RAISE EXCEPTION 'Transição inválida: só é possível CONFIRMAR quando status é SOLICITADA';
  END IF;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'NF_CONFIRMADA', 'INFO',
    'NF confirmada para carregamento com sucesso',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'SOLICITADA',
      'status_novo', 'CONFIRMADA',
      'solicitante_id', v_nf_info.requested_by
    )
  );
  
  -- Log do evento original (manter compatibilidade)
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'confirmacao_carregamento',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'SOLICITADA',
      'status_novo', 'CONFIRMADA',
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id,
      'solicitante_id', v_nf_info.requested_by
    )
  );
END;
$$;

-- Atualizar função nf_recusar para incluir logs
CREATE OR REPLACE FUNCTION public.nf_recusar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF e role do usuário
  SELECT status, numero_nf, cliente_id, transportadora_id, requested_by 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'NF_RECUSAR_ERROR', 'ERROR',
      'Tentativa de recusar NF inexistente',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id)
    );
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Determinar role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  -- Executar transição
  UPDATE public.notas_fiscais
  SET status = 'ARMAZENADA',
      requested_by = null,
      requested_at = null,
      approved_by = null,
      approved_at = null,
      updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'SOLICITADA';
    
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'NF_RECUSAR_INVALID_TRANSITION', 'WARN',
      'Tentativa de recusar NF com status inválido',
      p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
      jsonb_build_object(
        'nf_numero', v_nf_info.numero_nf,
        'status_atual', v_nf_info.status,
        'tentativa_transicao_para', 'ARMAZENADA'
      )
    );
    RAISE EXCEPTION 'Transição inválida: só é possível RECUSAR quando status é SOLICITADA';
  END IF;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'NF_RECUSADA', 'INFO',
    'NF recusada e retornada para armazenada',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'SOLICITADA',
      'status_novo', 'ARMAZENADA',
      'solicitante_id', v_nf_info.requested_by
    )
  );
  
  -- Log do evento original (manter compatibilidade)
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'recusa_carregamento',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'SOLICITADA',
      'status_novo', 'ARMAZENADA',
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id,
      'solicitante_id', v_nf_info.requested_by
    )
  );
END;
$$;