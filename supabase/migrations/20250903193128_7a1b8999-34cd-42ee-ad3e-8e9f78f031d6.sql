-- Atualizar função get_current_user_dashboard para incluir mercadorias em viagem e entregues
CREATE OR REPLACE FUNCTION public.get_current_user_dashboard()
RETURNS TABLE(
  user_type text,
  transportadora_id uuid,
  cliente_id uuid,
  solicitacoes_pendentes bigint,
  nfs_armazenadas bigint,
  nfs_confirmadas bigint,
  nfs_em_viagem bigint,
  nfs_entregues bigint,
  docs_vencendo bigint,
  docs_vencidos bigint,
  valor_pendente numeric,
  valor_vencido numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_transportadora_id uuid;
  v_cliente_id uuid;
  v_user_type text;
  v_result record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Determinar se é transportadora ou cliente
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_type
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NOT NULL THEN
    -- É usuário de transportadora
    v_user_type := 'transportadora';
    
    SELECT 
      v_user_type as user_type,
      v_transportadora_id as transportadora_id,
      NULL::uuid as cliente_id,
      -- Solicitações pendentes
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.transportadora_id = v_transportadora_id 
        AND nf.status = 'SOLICITADA'
      ), 0) as solicitacoes_pendentes,
      -- NFs armazenadas
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.transportadora_id = v_transportadora_id 
        AND nf.status = 'ARMAZENADA'
      ), 0) as nfs_armazenadas,
      -- NFs confirmadas
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.transportadora_id = v_transportadora_id 
        AND nf.status = 'CONFIRMADA'
      ), 0) as nfs_confirmadas,
      -- NFs em viagem
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.transportadora_id = v_transportadora_id 
        AND nf.status_separacao = 'em_viagem'
      ), 0) as nfs_em_viagem,
      -- NFs entregues
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.transportadora_id = v_transportadora_id 
        AND nf.status_separacao = 'entregue'
      ), 0) as nfs_entregues,
      -- Docs vencendo (próximos 7 dias)
      COALESCE((
        SELECT COUNT(*) 
        FROM documentos_financeiros df 
        WHERE df.transportadora_id = v_transportadora_id 
        AND df.status = 'Em aberto' 
        AND df.data_vencimento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
      ), 0) as docs_vencendo,
      -- Docs vencidos
      COALESCE((
        SELECT COUNT(*) 
        FROM documentos_financeiros df 
        WHERE df.transportadora_id = v_transportadora_id 
        AND df.status = 'Vencido'
      ), 0) as docs_vencidos,
      -- Valor pendente
      COALESCE((
        SELECT SUM(valor) 
        FROM documentos_financeiros df 
        WHERE df.transportadora_id = v_transportadora_id 
        AND df.status = 'Em aberto'
      ), 0) as valor_pendente,
      -- Valor vencido
      COALESCE((
        SELECT SUM(valor) 
        FROM documentos_financeiros df 
        WHERE df.transportadora_id = v_transportadora_id 
        AND df.status = 'Vencido'
      ), 0) as valor_vencido
    INTO v_result;
    
  ELSE
    -- É cliente
    SELECT c.id, c.transportadora_id 
    INTO v_cliente_id, v_transportadora_id
    FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = v_user_id AND c.status = 'ativo'
    LIMIT 1;
    
    IF v_cliente_id IS NULL THEN
      RAISE EXCEPTION 'Cliente não encontrado para este usuário';
    END IF;
    
    v_user_type := 'cliente';
    
    SELECT 
      v_user_type as user_type,
      v_transportadora_id as transportadora_id,
      v_cliente_id as cliente_id,
      -- Solicitações pendentes do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.cliente_id = v_cliente_id 
        AND nf.status = 'SOLICITADA'
      ), 0) as solicitacoes_pendentes,
      -- NFs armazenadas do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.cliente_id = v_cliente_id 
        AND nf.status = 'ARMAZENADA'
      ), 0) as nfs_armazenadas,
      -- NFs confirmadas do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.cliente_id = v_cliente_id 
        AND nf.status = 'CONFIRMADA'
      ), 0) as nfs_confirmadas,
      -- NFs em viagem do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.cliente_id = v_cliente_id 
        AND nf.status_separacao = 'em_viagem'
      ), 0) as nfs_em_viagem,
      -- NFs entregues do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM notas_fiscais nf 
        WHERE nf.cliente_id = v_cliente_id 
        AND nf.status_separacao = 'entregue'
      ), 0) as nfs_entregues,
      -- Docs vencendo do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM documentos_financeiros df 
        WHERE df.cliente_id = v_cliente_id 
        AND df.status = 'Em aberto' 
        AND df.data_vencimento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
      ), 0) as docs_vencendo,
      -- Docs vencidos do cliente
      COALESCE((
        SELECT COUNT(*) 
        FROM documentos_financeiros df 
        WHERE df.cliente_id = v_cliente_id 
        AND df.status = 'Vencido'
      ), 0) as docs_vencidos,
      -- Valor pendente do cliente
      COALESCE((
        SELECT SUM(valor) 
        FROM documentos_financeiros df 
        WHERE df.cliente_id = v_cliente_id 
        AND df.status = 'Em aberto'
      ), 0) as valor_pendente,
      -- Valor vencido do cliente
      COALESCE((
        SELECT SUM(valor) 
        FROM documentos_financeiros df 
        WHERE df.cliente_id = v_cliente_id 
        AND df.status = 'Vencido'
      ), 0) as valor_vencido
    INTO v_result;
  END IF;
  
  RETURN QUERY SELECT 
    v_result.user_type,
    v_result.transportadora_id,
    v_result.cliente_id,
    v_result.solicitacoes_pendentes,
    v_result.nfs_armazenadas,
    v_result.nfs_confirmadas,
    v_result.nfs_em_viagem,
    v_result.nfs_entregues,
    v_result.docs_vencendo,
    v_result.docs_vencidos,
    v_result.valor_pendente,
    v_result.valor_vencido;
END;
$function$;