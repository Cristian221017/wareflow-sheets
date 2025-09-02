-- Criar função para deletar Notas Fiscais
CREATE OR REPLACE FUNCTION public.nf_delete(p_nf_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF
  SELECT status, numero_nf, cliente_id, transportadora_id 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'NF_DELETE_ERROR', 'ERROR',
      'Tentativa de excluir NF inexistente',
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

  -- Verificar permissões - apenas transportadoras podem excluir
  IF NOT (v_user_role IN ('admin_transportadora', 'super_admin', 'operador')) THEN
    PERFORM log_system_event(
      'NF', 'NF_DELETE_PERMISSION_DENIED', 'WARN',
      'Tentativa de exclusão sem permissão',
      p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
      jsonb_build_object('user_role', v_user_role, 'nf_numero', v_nf_info.numero_nf)
    );
    RAISE EXCEPTION 'Apenas transportadoras podem excluir notas fiscais';
  END IF;

  -- Primeiro deletar eventos relacionados
  DELETE FROM public.nf_eventos WHERE nf_id = p_nf_id;
  
  -- Deletar solicitações relacionadas
  DELETE FROM public.solicitacoes_carregamento WHERE nf_id = p_nf_id;
  
  -- Deletar pedidos de liberação relacionados
  DELETE FROM public.pedidos_liberacao WHERE nota_fiscal_id = p_nf_id;
  
  -- Deletar pedidos liberados relacionados
  DELETE FROM public.pedidos_liberados WHERE nota_fiscal_id = p_nf_id;
  
  -- Finalmente deletar a NF
  DELETE FROM public.notas_fiscais WHERE id = p_nf_id;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'NF_DELETED', 'INFO',
    'Nota fiscal excluída com sucesso',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', v_nf_info.status,
      'deleted_by_role', v_user_role
    )
  );
  
  -- Log do evento original (manter compatibilidade)
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'nf_excluida',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', v_nf_info.status,
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id
    )
  );
END;
$function$;