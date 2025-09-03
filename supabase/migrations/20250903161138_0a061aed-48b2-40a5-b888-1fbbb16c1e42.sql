-- Corrigir função nf_update_status_separacao para funcionar corretamente
CREATE OR REPLACE FUNCTION public.nf_update_status_separacao(
  p_nf_id UUID,
  p_status_separacao TEXT,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_nf_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar informações da NF
  SELECT status, numero_nf, cliente_id, transportadora_id, status_separacao 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Verificar se pode alterar (permitir para ARMAZENADA e CONFIRMADA)
  IF v_nf_info.status NOT IN ('ARMAZENADA', 'CONFIRMADA') THEN
    RAISE EXCEPTION 'Status de separação só pode ser alterado quando NF está ARMAZENADA ou CONFIRMADA. Status atual: %', v_nf_info.status;
  END IF;
  
  -- Validar valores válidos de status_separacao
  IF p_status_separacao NOT IN ('pendente', 'em_separacao', 'separacao_concluida', 'separacao_com_pendencia', 'em_viagem', 'entregue') THEN
    RAISE EXCEPTION 'Status de separação inválido: %', p_status_separacao;
  END IF;
  
  -- Atualizar status de separação
  UPDATE public.notas_fiscais
  SET status_separacao = p_status_separacao,
      updated_at = now()
  WHERE id = p_nf_id;
  
  -- Log opcional (se função existe)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Ignore se função de log não existir
    NULL;
  END;
END;
$$;