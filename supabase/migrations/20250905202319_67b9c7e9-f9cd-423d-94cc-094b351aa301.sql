-- Corrigir search_path nas funções críticas para segurança
-- Problema identificado: Function Search Path Mutable (WARN)

-- 1. Função nf_create
DROP FUNCTION IF EXISTS public.nf_create(text, text, text, date, text, text, text, text, integer, numeric, numeric, text);
CREATE OR REPLACE FUNCTION public.nf_create(p_numero_nf text, p_numero_pedido text, p_ordem_compra text, p_data_recebimento date, p_fornecedor text, p_cnpj_fornecedor text, p_cliente_cnpj text, p_produto text, p_quantidade integer, p_peso numeric, p_volume numeric, p_localizacao text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
  
  RETURN v_nf_id;
END;
$function$;

-- 2. Função log_system_event
DROP FUNCTION IF EXISTS public.log_system_event(text, text, log_level, text, uuid, uuid, uuid, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.log_system_event(p_entity_type text, p_action text, p_status log_level DEFAULT 'INFO'::log_level, p_message text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_transportadora_id uuid DEFAULT NULL::uuid, p_cliente_id uuid DEFAULT NULL::uuid, p_meta jsonb DEFAULT '{}'::jsonb, p_correlation_id uuid DEFAULT NULL::uuid)
 RETURNS system_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE 
  v_log system_logs;
  v_user_role text;
BEGIN
  -- Obter role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  INSERT INTO system_logs (
    actor_user_id, actor_role, transportadora_id, cliente_id,
    entity_type, entity_id, action, status, message, meta, correlation_id
  )
  VALUES (
    auth.uid(),
    v_user_role,
    COALESCE(p_transportadora_id, get_user_transportadora(auth.uid())),
    p_cliente_id,
    p_entity_type, p_entity_id, p_action, p_status, p_message, 
    COALESCE(p_meta, '{}'),
    COALESCE(p_correlation_id, gen_random_uuid())
  )
  RETURNING * INTO v_log;

  RETURN v_log;
END $function$;

-- 3. Função get_user_data_optimized  
DROP FUNCTION IF EXISTS public.get_user_data_optimized(uuid, text);
CREATE OR REPLACE FUNCTION public.get_user_data_optimized(p_user_id uuid, p_email text)
 RETURNS TABLE(user_type text, user_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  v_profile_data jsonb;
  v_user_transportadora jsonb;
  v_cliente_data jsonb;
  v_user_cliente_link boolean := false;
BEGIN
  -- Buscar profile (sempre deveria existir)
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'email', p.email,
    'user_id', p.user_id
  ) INTO v_profile_data
  FROM profiles p
  WHERE p.user_id = p_user_id;
  
  -- Verificar se tem vínculo com transportadora
  SELECT jsonb_build_object(
    'role', ut.role,
    'transportadora_id', ut.transportadora_id,
    'is_active', ut.is_active
  ) INTO v_user_transportadora
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;
  
  -- Se tem vínculo com transportadora, retornar como transportadora user
  IF v_user_transportadora IS NOT NULL THEN
    RETURN QUERY SELECT 
      'transportadora'::text,
      jsonb_build_object(
        'id', p_user_id,
        'name', COALESCE(v_profile_data->>'name', split_part(p_email, '@', 1)),
        'email', p_email,
        'type', 'transportadora',
        'role', v_user_transportadora->>'role',
        'transportadora_id', v_user_transportadora->>'transportadora_id'
      );
    RETURN;
  END IF;
  
  -- Verificar se tem vínculo com cliente
  SELECT true INTO v_user_cliente_link
  FROM user_clientes uc
  WHERE uc.user_id = p_user_id
  LIMIT 1;
  
  -- Buscar dados do cliente se tem vínculo
  IF v_user_cliente_link THEN
    SELECT jsonb_build_object(
      'cliente_id', c.id,
      'razao_social', c.razao_social,
      'cnpj', c.cnpj,
      'email_nota_fiscal', c.email_nota_fiscal,
      'email_solicitacao_liberacao', c.email_solicitacao_liberacao,
      'email_liberacao_autorizada', c.email_liberacao_autorizada,
      'transportadora_id', c.transportadora_id
    ) INTO v_cliente_data
    FROM user_clientes uc
    JOIN clientes c ON c.id = uc.cliente_id
    WHERE uc.user_id = p_user_id AND c.status = 'ativo'
    LIMIT 1;
    
    IF v_cliente_data IS NOT NULL THEN
      RETURN QUERY SELECT 
        'cliente'::text,
        jsonb_build_object(
          'id', p_user_id,
          'name', v_cliente_data->>'razao_social',
          'email', p_email,
          'type', 'cliente',
          'cnpj', v_cliente_data->>'cnpj',
          'emailNotaFiscal', v_cliente_data->>'email_nota_fiscal',
          'emailSolicitacaoLiberacao', v_cliente_data->>'email_solicitacao_liberacao',
          'emailLiberacaoAutorizada', v_cliente_data->>'email_liberacao_autorizada',
          'clienteId', v_cliente_data->>'cliente_id',
          'transportadoraId', v_cliente_data->>'transportadora_id'
        );
      RETURN;
    END IF;
  END IF;
  
  -- Fallback: criar usuário básico
  RETURN QUERY SELECT 
    'cliente'::text,
    jsonb_build_object(
      'id', p_user_id,
      'name', COALESCE(v_profile_data->>'name', split_part(p_email, '@', 1)),
      'email', p_email,
      'type', 'cliente'
    );
END;
$function$;