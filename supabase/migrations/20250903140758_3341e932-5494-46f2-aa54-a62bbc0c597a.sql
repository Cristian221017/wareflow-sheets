-- Atualizar função para permitir alteração de status de separação em NFs CONFIRMADAS também
CREATE OR REPLACE FUNCTION public.nf_update_status_separacao(p_nf_id uuid, p_status_separacao separacao_status, p_observacoes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    PERFORM log_system_event(
      'NF', 'STATUS_SEPARACAO_AUTH_ERROR', 'ERROR',
      'Tentativa de atualizar status separação sem autenticação',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id, 'novo_status', p_status_separacao)
    );
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar informações da NF
  SELECT status, numero_nf, cliente_id, transportadora_id, status_separacao 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'STATUS_SEPARACAO_NF_NOT_FOUND', 'ERROR',
      'NF não encontrada para atualização de status separação',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id)
    );
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Verificar se NF está ARMAZENADA ou CONFIRMADA (pode alterar status separação nestes estados)
  IF v_nf_info.status NOT IN ('ARMAZENADA', 'CONFIRMADA') THEN
    PERFORM log_system_event(
      'NF', 'STATUS_SEPARACAO_INVALID_STATE', 'WARN',
      'Tentativa de alterar status separação em NF com status inválido',
      p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
      jsonb_build_object(
        'nf_numero', v_nf_info.numero_nf,
        'status_atual', v_nf_info.status,
        'status_separacao_tentativa', p_status_separacao
      )
    );
    RAISE EXCEPTION 'Status de separação só pode ser alterado quando NF está ARMAZENADA ou CONFIRMADA';
  END IF;
  
  -- Determinar role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'operador';
  END IF;
  
  -- Atualizar status de separação
  UPDATE public.notas_fiscais
  SET status_separacao = p_status_separacao,
      updated_at = now()
  WHERE id = p_nf_id;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'STATUS_SEPARACAO_UPDATED', 'INFO',
    'Status de separação atualizado com sucesso',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_separacao_anterior', v_nf_info.status_separacao,
      'status_separacao_novo', p_status_separacao,
      'observacoes', p_observacoes,
      'nf_status', v_nf_info.status
    )
  );
END;
$function$;