-- Corrigir função get_current_user_dashboard para evitar contagem incorreta de NFs
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
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_transportadora_id uuid;
  v_cliente_id uuid;
  v_user_type text := 'cliente';
BEGIN
  v_user_id := auth.uid();
  
  -- Verificar se é usuário de transportadora
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NOT NULL THEN
    v_user_type := 'transportadora';
    
    -- Dashboard para transportadora
    RETURN QUERY
    SELECT 
      v_user_type::text,
      v_transportadora_id,
      NULL::uuid,
      COALESCE((SELECT COUNT(*) FROM solicitacoes_carregamento sc WHERE sc.transportadora_id = v_transportadora_id AND sc.status = 'PENDENTE'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.transportadora_id = v_transportadora_id AND nf.status = 'ARMAZENADA'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.transportadora_id = v_transportadora_id AND nf.status = 'CONFIRMADA'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.transportadora_id = v_transportadora_id AND nf.status IN ('EM_VIAGEM', 'EMBARCADA')), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.transportadora_id = v_transportadora_id AND nf.status IN ('ENTREGUE', 'ENTREGUES')), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM documentos_financeiros df WHERE df.transportadora_id = v_transportadora_id AND df.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND df.status = 'Em aberto'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM documentos_financeiros df WHERE df.transportadora_id = v_transportadora_id AND df.data_vencimento < CURRENT_DATE AND df.status IN ('Em aberto', 'Vencido')), 0)::bigint,
      COALESCE((SELECT SUM(df.valor) FROM documentos_financeiros df WHERE df.transportadora_id = v_transportadora_id AND df.status = 'Em aberto'), 0),
      COALESCE((SELECT SUM(df.valor) FROM documentos_financeiros df WHERE df.transportadora_id = v_transportadora_id AND df.data_vencimento < CURRENT_DATE AND df.status IN ('Em aberto', 'Vencido')), 0);
    RETURN;
  END IF;
  
  -- Verificar se é cliente
  SELECT uc.cliente_id INTO v_cliente_id
  FROM user_clientes uc
  WHERE uc.user_id = v_user_id
  LIMIT 1;
  
  IF v_cliente_id IS NOT NULL THEN
    -- Buscar transportadora do cliente
    SELECT c.transportadora_id INTO v_transportadora_id
    FROM clientes c
    WHERE c.id = v_cliente_id;
    
    -- Dashboard para cliente - usar EXISTS para evitar contagem duplicada
    RETURN QUERY
    SELECT 
      v_user_type::text,
      v_transportadora_id,
      v_cliente_id,
      COALESCE((SELECT COUNT(*) FROM solicitacoes_carregamento sc WHERE sc.cliente_id = v_cliente_id AND sc.status = 'PENDENTE'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.cliente_id = v_cliente_id AND nf.status = 'ARMAZENADA'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.cliente_id = v_cliente_id AND nf.status = 'CONFIRMADA'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.cliente_id = v_cliente_id AND nf.status IN ('EM_VIAGEM', 'EMBARCADA')), 0)::bigint,
      -- Corrigir consulta para NFs entregues - usar apenas NFs que realmente existem
      COALESCE((SELECT COUNT(*) FROM notas_fiscais nf WHERE nf.cliente_id = v_cliente_id AND nf.status IN ('ENTREGUE', 'ENTREGUES')), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM documentos_financeiros df WHERE df.cliente_id = v_cliente_id AND df.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND df.status = 'Em aberto'), 0)::bigint,
      COALESCE((SELECT COUNT(*) FROM documentos_financeiros df WHERE df.cliente_id = v_cliente_id AND df.data_vencimento < CURRENT_DATE AND df.status IN ('Em aberto', 'Vencido')), 0)::bigint,
      COALESCE((SELECT SUM(df.valor) FROM documentos_financeiros df WHERE df.cliente_id = v_cliente_id AND df.status = 'Em aberto'), 0),
      COALESCE((SELECT SUM(df.valor) FROM documentos_financeiros df WHERE df.cliente_id = v_cliente_id AND df.data_vencimento < CURRENT_DATE AND df.status IN ('Em aberto', 'Vencido')), 0);
    RETURN;
  END IF;
  
  -- Fallback - retornar zeros
  RETURN QUERY
  SELECT 
    v_user_type::text,
    NULL::uuid,
    NULL::uuid,
    0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
    0::numeric, 0::numeric;
END;
$function$;