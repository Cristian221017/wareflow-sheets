-- Atualizar função financeiro_create_documento para incluir logs
CREATE OR REPLACE FUNCTION public.financeiro_create_documento(p_cliente_id uuid, p_numero_cte text, p_data_vencimento date, p_valor numeric, p_observacoes text DEFAULT NULL::text, p_status text DEFAULT 'Em aberto'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_transportadora_id UUID;
  v_documento_id UUID;
  v_cliente_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    PERFORM log_system_event(
      'FINANCEIRO', 'DOC_CREATE_AUTH_ERROR', 'ERROR',
      'Tentativa de criar documento sem autenticação',
      NULL, NULL, p_cliente_id
    );
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter transportadora do usuário
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    PERFORM log_system_event(
      'FINANCEIRO', 'DOC_CREATE_NO_TRANSPORTADORA', 'ERROR',
      'Usuário sem transportadora associada tentou criar documento',
      NULL, NULL, p_cliente_id
    );
    RAISE EXCEPTION 'Usuário não tem transportadora associada';
  END IF;
  
  -- Verificar se cliente pertence à transportadora
  SELECT c.razao_social INTO v_cliente_info
  FROM clientes c 
  WHERE c.id = p_cliente_id 
  AND c.transportadora_id = v_transportadora_id
  AND c.status = 'ativo';
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'FINANCEIRO', 'DOC_CREATE_INVALID_CLIENT', 'ERROR',
      'Tentativa de criar documento para cliente inválido',
      NULL, v_transportadora_id, p_cliente_id,
      jsonb_build_object('numero_cte', p_numero_cte)
    );
    RAISE EXCEPTION 'Cliente não encontrado ou não pertence à transportadora';
  END IF;
  
  -- Criar documento
  INSERT INTO documentos_financeiros (
    transportadora_id,
    cliente_id,
    numero_cte,
    data_vencimento,
    valor,
    observacoes,
    status
  ) VALUES (
    v_transportadora_id,
    p_cliente_id,
    p_numero_cte,
    p_data_vencimento,
    p_valor,
    p_observacoes,
    p_status
  ) RETURNING id INTO v_documento_id;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'FINANCEIRO', 'DOC_CREATED', 'INFO',
    'Documento financeiro criado com sucesso',
    v_documento_id, v_transportadora_id, p_cliente_id,
    jsonb_build_object(
      'numero_cte', p_numero_cte,
      'valor', p_valor,
      'data_vencimento', p_data_vencimento,
      'status', p_status,
      'cliente_razao_social', v_cliente_info.razao_social
    )
  );
  
  -- Registrar evento original (manter compatibilidade)
  PERFORM log_event(
    v_user_id,
    v_user_role,
    'documento_financeiro',
    v_documento_id,
    'documento_criado',
    jsonb_build_object(
      'numero_cte', p_numero_cte,
      'cliente_id', p_cliente_id,
      'valor', p_valor,
      'data_vencimento', p_data_vencimento,
      'status', p_status
    )
  );
  
  RETURN v_documento_id;
END;
$$;

-- Atualizar função financeiro_update_documento para incluir logs
CREATE OR REPLACE FUNCTION public.financeiro_update_documento(p_documento_id uuid, p_status text DEFAULT NULL::text, p_valor numeric DEFAULT NULL::numeric, p_observacoes text DEFAULT NULL::text, p_data_pagamento date DEFAULT NULL::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_doc_info RECORD;
  v_changes JSONB := '{}';
  v_log_message TEXT;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    PERFORM log_system_event(
      'FINANCEIRO', 'DOC_UPDATE_AUTH_ERROR', 'ERROR',
      'Tentativa de atualizar documento sem autenticação',
      p_documento_id, NULL, NULL
    );
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar informações do documento
  SELECT d.numero_cte, d.cliente_id, d.transportadora_id, d.status, d.valor, d.observacoes, d.data_pagamento, c.razao_social as cliente_nome
  INTO v_doc_info
  FROM documentos_financeiros d
  LEFT JOIN clientes c ON c.id = d.cliente_id
  WHERE d.id = p_documento_id;
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'FINANCEIRO', 'DOC_UPDATE_NOT_FOUND', 'ERROR',
      'Tentativa de atualizar documento inexistente',
      p_documento_id, NULL, NULL
    );
    RAISE EXCEPTION 'Documento financeiro não encontrado';
  END IF;
  
  -- Determinar role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;
    
  -- Construir update dinâmico e changes
  IF p_status IS NOT NULL AND p_status != v_doc_info.status THEN
    v_changes := jsonb_set(v_changes, '{status_anterior}', to_jsonb(v_doc_info.status));
    v_changes := jsonb_set(v_changes, '{status_novo}', to_jsonb(p_status));
  END IF;
  
  IF p_valor IS NOT NULL AND p_valor != v_doc_info.valor THEN
    v_changes := jsonb_set(v_changes, '{valor_anterior}', to_jsonb(v_doc_info.valor));
    v_changes := jsonb_set(v_changes, '{valor_novo}', to_jsonb(p_valor));
  END IF;
  
  IF p_data_pagamento IS NOT NULL AND p_data_pagamento != v_doc_info.data_pagamento THEN
    v_changes := jsonb_set(v_changes, '{data_pagamento_anterior}', to_jsonb(v_doc_info.data_pagamento));
    v_changes := jsonb_set(v_changes, '{data_pagamento_nova}', to_jsonb(p_data_pagamento));
  END IF;
  
  -- Executar update
  UPDATE documentos_financeiros
  SET 
    status = COALESCE(p_status, status),
    valor = COALESCE(p_valor, valor),
    observacoes = COALESCE(p_observacoes, observacoes),
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    updated_at = now()
  WHERE id = p_documento_id;
  
  -- Gerar mensagem de log baseada nas alterações
  IF p_status IS NOT NULL AND p_status = 'Pago' THEN
    v_log_message := 'Documento financeiro marcado como pago';
  ELSIF p_status IS NOT NULL AND p_status = 'Vencido' THEN
    v_log_message := 'Documento financeiro marcado como vencido';
  ELSIF p_valor IS NOT NULL THEN
    v_log_message := 'Valor do documento financeiro atualizado';
  ELSE
    v_log_message := 'Documento financeiro atualizado';
  END IF;
  
  -- Registrar evento de sistema apenas se houve mudanças
  IF v_changes != '{}' THEN
    v_changes := jsonb_set(v_changes, '{numero_cte}', to_jsonb(v_doc_info.numero_cte));
    v_changes := jsonb_set(v_changes, '{cliente_id}', to_jsonb(v_doc_info.cliente_id));
    v_changes := jsonb_set(v_changes, '{cliente_nome}', to_jsonb(v_doc_info.cliente_nome));
    
    PERFORM log_system_event(
      'FINANCEIRO', 'DOC_UPDATED', 'INFO',
      v_log_message,
      p_documento_id, v_doc_info.transportadora_id, v_doc_info.cliente_id,
      v_changes
    );
    
    -- Log do evento original (manter compatibilidade)
    PERFORM log_event(
      v_user_id,
      v_user_role,
      'documento_financeiro',
      p_documento_id,
      'documento_atualizado',
      v_changes
    );
  END IF;
END;
$$;

-- Atualizar função nf_create para incluir logs
CREATE OR REPLACE FUNCTION public.nf_create(p_numero_nf text, p_numero_pedido text, p_ordem_compra text, p_data_recebimento date, p_fornecedor text, p_cnpj_fornecedor text, p_cliente_cnpj text, p_produto text, p_quantidade integer, p_peso numeric, p_volume numeric, p_localizacao text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_transportadora_id UUID;
  v_cliente_id UUID;
  v_nf_id UUID;
  v_cliente_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    PERFORM log_system_event(
      'NF', 'NF_CREATE_AUTH_ERROR', 'ERROR',
      'Tentativa de criar NF sem autenticação',
      NULL, NULL, NULL,
      jsonb_build_object('numero_nf', p_numero_nf)
    );
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter transportadora do usuário
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    PERFORM log_system_event(
      'NF', 'NF_CREATE_NO_TRANSPORTADORA', 'ERROR',
      'Usuário sem transportadora associada tentou criar NF',
      NULL, NULL, NULL,
      jsonb_build_object('numero_nf', p_numero_nf, 'cliente_cnpj', p_cliente_cnpj)
    );
    RAISE EXCEPTION 'Usuário não tem transportadora associada';
  END IF;
  
  -- Buscar cliente pelo CNPJ
  SELECT id, razao_social INTO v_cliente_info
  FROM clientes
  WHERE cnpj = p_cliente_cnpj 
  AND transportadora_id = v_transportadora_id
  AND status = 'ativo';
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'NF_CREATE_CLIENT_NOT_FOUND', 'ERROR',
      'Cliente não encontrado para criação de NF',
      NULL, v_transportadora_id, NULL,
      jsonb_build_object(
        'numero_nf', p_numero_nf,
        'cliente_cnpj', p_cliente_cnpj,
        'fornecedor', p_fornecedor
      )
    );
    RAISE EXCEPTION 'Cliente não encontrado: %', p_cliente_cnpj;
  END IF;
  
  v_cliente_id := v_cliente_info.id;
  
  -- Criar NF
  INSERT INTO notas_fiscais (
    numero_nf,
    numero_pedido,
    ordem_compra,
    data_recebimento,
    fornecedor,
    cnpj_fornecedor,
    cliente_id,
    transportadora_id,
    produto,
    quantidade,
    peso,
    volume,
    localizacao,
    status
  ) VALUES (
    p_numero_nf,
    p_numero_pedido,
    p_ordem_compra,
    p_data_recebimento,
    p_fornecedor,
    p_cnpj_fornecedor,
    v_cliente_id,
    v_transportadora_id,
    p_produto,
    p_quantidade,
    p_peso,
    p_volume,
    p_localizacao,
    'ARMAZENADA'
  ) RETURNING id INTO v_nf_id;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'NF_CREATED', 'INFO',
    'Nova nota fiscal criada e armazenada',
    v_nf_id, v_transportadora_id, v_cliente_id,
    jsonb_build_object(
      'numero_nf', p_numero_nf,
      'cliente_razao_social', v_cliente_info.razao_social,
      'fornecedor', p_fornecedor,
      'produto', p_produto,
      'quantidade', p_quantidade,
      'peso', p_peso,
      'volume', p_volume,
      'localizacao', p_localizacao
    )
  );
  
  -- Registrar evento original (manter compatibilidade)
  PERFORM log_event(
    v_user_id,
    v_user_role,
    'nota_fiscal',
    v_nf_id,
    'nf_criada',
    jsonb_build_object(
      'numero_nf', p_numero_nf,
      'cliente_id', v_cliente_id,
      'transportadora_id', v_transportadora_id,
      'produto', p_produto,
      'quantidade', p_quantidade,
      'peso', p_peso,
      'volume', p_volume
    )
  );
  
  RETURN v_nf_id;
END;
$$;