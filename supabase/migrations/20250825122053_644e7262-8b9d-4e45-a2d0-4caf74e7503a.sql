-- RPCs para operações financeiras (garantir única fonte de verdade)
CREATE OR REPLACE FUNCTION public.financeiro_create_documento(
  p_cliente_id UUID,
  p_numero_cte TEXT,
  p_data_vencimento DATE,
  p_valor NUMERIC,
  p_observacoes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Em aberto'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_transportadora_id UUID;
  v_documento_id UUID;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter transportadora do usuário
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem transportadora associada';
  END IF;
  
  -- Verificar se cliente pertence à transportadora
  IF NOT EXISTS (
    SELECT 1 FROM clientes c 
    WHERE c.id = p_cliente_id 
    AND c.transportadora_id = v_transportadora_id
    AND c.status = 'ativo'
  ) THEN
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
  
  -- Registrar evento
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

-- RPC para atualização de documento financeiro
CREATE OR REPLACE FUNCTION public.financeiro_update_documento(
  p_documento_id UUID,
  p_status TEXT DEFAULT NULL,
  p_valor NUMERIC DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_data_pagamento DATE DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_doc_info RECORD;
  v_changes JSONB := '{}';
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar informações do documento
  SELECT d.numero_cte, d.cliente_id, d.transportadora_id, d.status, d.valor, d.observacoes, d.data_pagamento
  INTO v_doc_info
  FROM documentos_financeiros d
  WHERE d.id = p_documento_id;
  
  IF NOT FOUND THEN
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
    
  -- Construir update dinâmico
  IF p_status IS NOT NULL AND p_status != v_doc_info.status THEN
    v_changes := jsonb_set(v_changes, '{status_anterior}', to_jsonb(v_doc_info.status));
    v_changes := jsonb_set(v_changes, '{status_novo}', to_jsonb(p_status));
  END IF;
  
  IF p_valor IS NOT NULL AND p_valor != v_doc_info.valor THEN
    v_changes := jsonb_set(v_changes, '{valor_anterior}', to_jsonb(v_doc_info.valor));
    v_changes := jsonb_set(v_changes, '{valor_novo}', to_jsonb(p_valor));
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
  
  -- Registrar evento apenas se houve mudanças
  IF v_changes != '{}' THEN
    v_changes := jsonb_set(v_changes, '{numero_cte}', to_jsonb(v_doc_info.numero_cte));
    v_changes := jsonb_set(v_changes, '{cliente_id}', to_jsonb(v_doc_info.cliente_id));
    
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

-- RPC para criar NF (única fonte de escrita)
CREATE OR REPLACE FUNCTION public.nf_create(
  p_numero_nf TEXT,
  p_numero_pedido TEXT,
  p_ordem_compra TEXT,
  p_data_recebimento DATE,
  p_fornecedor TEXT,
  p_cnpj_fornecedor TEXT,
  p_cliente_cnpj TEXT,
  p_produto TEXT,
  p_quantidade INTEGER,
  p_peso NUMERIC,
  p_volume NUMERIC,
  p_localizacao TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_transportadora_id UUID;
  v_cliente_id UUID;
  v_nf_id UUID;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter transportadora do usuário
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem transportadora associada';
  END IF;
  
  -- Buscar cliente pelo CNPJ
  SELECT id INTO v_cliente_id
  FROM clientes
  WHERE cnpj = p_cliente_cnpj 
  AND transportadora_id = v_transportadora_id
  AND status = 'ativo';
  
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado: %', p_cliente_cnpj;
  END IF;
  
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
  
  -- Registrar evento
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

-- Views materializadas para caixas de tarefas por papel
CREATE MATERIALIZED VIEW public.mv_transportadora_dashboard AS
SELECT 
  ut.transportadora_id,
  COUNT(*) FILTER (WHERE nf.status = 'SOLICITADA') AS solicitacoes_pendentes,
  COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA') AS nfs_armazenadas,
  COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA') AS nfs_confirmadas,
  COUNT(*) FILTER (WHERE df.status = 'Em aberto' AND df.data_vencimento <= CURRENT_DATE + INTERVAL '3 days') AS docs_vencendo,
  COUNT(*) FILTER (WHERE df.status = 'Vencido') AS docs_vencidos,
  MAX(nf.updated_at) AS ultima_atualizacao_nf,
  MAX(df.updated_at) AS ultima_atualizacao_df
FROM user_transportadoras ut
LEFT JOIN notas_fiscais nf ON nf.transportadora_id = ut.transportadora_id
LEFT JOIN documentos_financeiros df ON df.transportadora_id = ut.transportadora_id
WHERE ut.is_active = true
GROUP BY ut.transportadora_id;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX idx_mv_transportadora_dashboard_id ON public.mv_transportadora_dashboard(transportadora_id);

-- View para dashboard cliente
CREATE MATERIALIZED VIEW public.mv_cliente_dashboard AS
SELECT 
  c.id AS cliente_id,
  c.transportadora_id,
  COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA') AS nfs_armazenadas,
  COUNT(*) FILTER (WHERE nf.status = 'SOLICITADA') AS solicitacoes_enviadas,
  COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA') AS carregamentos_confirmados,
  COUNT(*) FILTER (WHERE df.status = 'Em aberto') AS boletos_pendentes,
  COUNT(*) FILTER (WHERE df.status = 'Vencido') AS boletos_vencidos,
  SUM(df.valor) FILTER (WHERE df.status = 'Em aberto') AS valor_pendente,
  SUM(df.valor) FILTER (WHERE df.status = 'Vencido') AS valor_vencido,
  MAX(nf.updated_at) AS ultima_atualizacao_nf,
  MAX(df.updated_at) AS ultima_atualizacao_df
FROM clientes c
LEFT JOIN notas_fiscais nf ON nf.cliente_id = c.id
LEFT JOIN documentos_financeiros df ON df.cliente_id = c.id
WHERE c.status = 'ativo'
GROUP BY c.id, c.transportadora_id;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX idx_mv_cliente_dashboard_id ON public.mv_cliente_dashboard(cliente_id);

-- RLS para views materializadas
ALTER MATERIALIZED VIEW public.mv_transportadora_dashboard OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_cliente_dashboard OWNER TO postgres;

-- Função para refresh das views materializadas
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_transportadora_dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cliente_dashboard;
END;
$$;

-- Trigger para refresh automático das views (limitado para performance)
CREATE OR REPLACE FUNCTION public.trigger_refresh_dashboards()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Usar pg_notify para refresh assíncrono
  PERFORM pg_notify('dashboard_refresh', 'update');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers nos pontos críticos de mudança
CREATE TRIGGER tr_nf_dashboard_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_dashboards();

CREATE TRIGGER tr_df_dashboard_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.documentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_dashboards();