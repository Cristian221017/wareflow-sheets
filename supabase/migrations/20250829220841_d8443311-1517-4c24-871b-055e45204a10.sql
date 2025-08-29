-- CORREÇÃO CRÍTICA: Função RPC deve contar solicitações unificadas como o hook
-- Atualizar get_current_user_dashboard para unificar contagem de solicitações

CREATE OR REPLACE FUNCTION public.get_current_user_dashboard()
RETURNS TABLE(user_type text, transportadora_id uuid, cliente_id uuid, solicitacoes_pendentes bigint, nfs_armazenadas bigint, nfs_confirmadas bigint, docs_vencendo bigint, docs_vencidos bigint, valor_pendente numeric, valor_vencido numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_transportadora UUID;
  v_user_role TEXT;
  v_cliente_info RECORD;
  v_solicitacoes_pendentes BIGINT;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se é usuário de transportadora
  SELECT ut.transportadora_id, ut.role 
  INTO v_user_transportadora, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_user_transportadora IS NOT NULL THEN
    -- CORREÇÃO: Contar solicitações pendentes unificadas (modernas + legado)
    -- 1. Solicitações modernas pendentes
    -- 2. NFs legado solicitadas que não têm entrada em solicitacoes_carregamento
    WITH solicitacoes_modernas AS (
      SELECT COUNT(*) as count
      FROM solicitacoes_carregamento sc
      WHERE sc.transportadora_id = v_user_transportadora 
      AND sc.status = 'PENDENTE'
    ),
    nfs_solicitadas AS (
      SELECT COUNT(*) as count
      FROM notas_fiscais nf
      WHERE nf.transportadora_id = v_user_transportadora 
      AND nf.status = 'SOLICITADA'
      AND NOT EXISTS (
        SELECT 1 FROM solicitacoes_carregamento sc 
        WHERE sc.nf_id = nf.id
      )
    )
    SELECT (sm.count + ns.count) INTO v_solicitacoes_pendentes
    FROM solicitacoes_modernas sm, nfs_solicitadas ns;

    -- Usuário é da transportadora - retornar dados unificados
    RETURN QUERY
    SELECT 
      'transportadora'::TEXT,
      v_user_transportadora,
      NULL::UUID,
      v_solicitacoes_pendentes,
      COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA'),
      COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA'),
      COUNT(*) FILTER (WHERE df.status = 'Em aberto' AND df.data_vencimento <= CURRENT_DATE + INTERVAL '3 days'),
      COUNT(*) FILTER (WHERE df.status = 'Vencido'),
      SUM(df.valor) FILTER (WHERE df.status = 'Em aberto'),
      SUM(df.valor) FILTER (WHERE df.status = 'Vencido')
    FROM notas_fiscais nf
    FULL OUTER JOIN documentos_financeiros df ON df.transportadora_id = nf.transportadora_id
    WHERE nf.transportadora_id = v_user_transportadora OR df.transportadora_id = v_user_transportadora;
  ELSE
    -- Verificar se é cliente
    SELECT c.id, c.transportadora_id
    INTO v_cliente_info
    FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = v_user_id AND c.status = 'ativo'
    LIMIT 1;
    
    IF v_cliente_info.id IS NOT NULL THEN
      -- Para cliente, também contar solicitações unificadas
      WITH solicitacoes_modernas AS (
        SELECT COUNT(*) as count
        FROM solicitacoes_carregamento sc
        WHERE sc.cliente_id = v_cliente_info.id 
        AND sc.status = 'PENDENTE'
      ),
      nfs_solicitadas AS (
        SELECT COUNT(*) as count
        FROM notas_fiscais nf
        WHERE nf.cliente_id = v_cliente_info.id 
        AND nf.status = 'SOLICITADA'
        AND NOT EXISTS (
          SELECT 1 FROM solicitacoes_carregamento sc 
          WHERE sc.nf_id = nf.id
        )
      )
      SELECT (sm.count + ns.count) INTO v_solicitacoes_pendentes
      FROM solicitacoes_modernas sm, nfs_solicitadas ns;

      -- Usuário é cliente - retornar dados unificados
      RETURN QUERY
      SELECT 
        'cliente'::TEXT,
        v_cliente_info.transportadora_id,
        v_cliente_info.id,
        v_solicitacoes_pendentes,
        COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA'),
        COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA'),
        COUNT(*) FILTER (WHERE df.status = 'Em aberto'),
        COUNT(*) FILTER (WHERE df.status = 'Vencido'),
        SUM(df.valor) FILTER (WHERE df.status = 'Em aberto'),
        SUM(df.valor) FILTER (WHERE df.status = 'Vencido')
      FROM notas_fiscais nf
      FULL OUTER JOIN documentos_financeiros df ON df.cliente_id = nf.cliente_id
      WHERE nf.cliente_id = v_cliente_info.id OR df.cliente_id = v_cliente_info.id;
    ELSE
      -- Usuário não tem permissão
      RAISE EXCEPTION 'Usuário não tem permissão para acessar dashboard';
    END IF;
  END IF;
END;
$function$