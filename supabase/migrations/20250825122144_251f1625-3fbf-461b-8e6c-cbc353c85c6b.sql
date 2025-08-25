-- Corrigir problemas de segurança detectados pelo linter

-- Corrigir função trigger_refresh_dashboards sem search_path
CREATE OR REPLACE FUNCTION public.trigger_refresh_dashboards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Usar pg_notify para refresh assíncrono
  PERFORM pg_notify('dashboard_refresh', 'update');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Corrigir função refresh_dashboard_views sem search_path
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_transportadora_dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cliente_dashboard;
END;
$$;

-- Remover views materializadas da API pública (security issue)
-- Criar views normais com RLS para substituir as materializadas
DROP MATERIALIZED VIEW IF EXISTS public.mv_transportadora_dashboard;
DROP MATERIALIZED VIEW IF EXISTS public.mv_cliente_dashboard;

-- View para dashboard transportadora (com RLS)
CREATE VIEW public.vw_transportadora_dashboard AS
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

-- View para dashboard cliente (com RLS)
CREATE VIEW public.vw_cliente_dashboard AS
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

-- RLS para as views
ALTER VIEW public.vw_transportadora_dashboard OWNER TO postgres;
ALTER VIEW public.vw_cliente_dashboard OWNER TO postgres;

-- RLS policies para view transportadora
CREATE POLICY "Transportadoras can view their dashboard" 
ON public.vw_transportadora_dashboard
FOR SELECT 
USING (
  transportadora_id = get_user_transportadora(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- RLS policies para view cliente  
CREATE POLICY "Clientes can view their dashboard" 
ON public.vw_cliente_dashboard
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
    AND c.id = vw_cliente_dashboard.cliente_id
    AND c.status = 'ativo'
  )
  OR has_role(auth.uid(), 'super_admin'::user_role)
  OR transportadora_id = get_user_transportadora(auth.uid())
);

-- Habilitar RLS nas views
ALTER VIEW public.vw_transportadora_dashboard ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.vw_cliente_dashboard ENABLE ROW LEVEL SECURITY;

-- Atualizar função refresh_dashboard_views para usar as novas views
CREATE OR REPLACE FUNCTION public.get_transportadora_stats(p_transportadora_id UUID)
RETURNS TABLE (
  transportadora_id UUID,
  solicitacoes_pendentes BIGINT,
  nfs_armazenadas BIGINT,
  nfs_confirmadas BIGINT,
  docs_vencendo BIGINT,
  docs_vencidos BIGINT,
  ultima_atualizacao_nf TIMESTAMP WITH TIME ZONE,
  ultima_atualizacao_df TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_transportadora_id,
    COUNT(*) FILTER (WHERE nf.status = 'SOLICITADA') AS solicitacoes_pendentes,
    COUNT(*) FILTER (WHERE nf.status = 'ARMAZENADA') AS nfs_armazenadas,
    COUNT(*) FILTER (WHERE nf.status = 'CONFIRMADA') AS nfs_confirmadas,
    COUNT(*) FILTER (WHERE df.status = 'Em aberto' AND df.data_vencimento <= CURRENT_DATE + INTERVAL '3 days') AS docs_vencendo,
    COUNT(*) FILTER (WHERE df.status = 'Vencido') AS docs_vencidos,
    MAX(nf.updated_at) AS ultima_atualizacao_nf,
    MAX(df.updated_at) AS ultima_atualizacao_df
  FROM notas_fiscais nf
  FULL OUTER JOIN documentos_financeiros df ON df.transportadora_id = nf.transportadora_id
  WHERE nf.transportadora_id = p_transportadora_id OR df.transportadora_id = p_transportadora_id;
END;
$$;

-- Função para stats do cliente
CREATE OR REPLACE FUNCTION public.get_cliente_stats(p_cliente_id UUID)
RETURNS TABLE (
  cliente_id UUID,
  transportadora_id UUID,
  nfs_armazenadas BIGINT,
  solicitacoes_enviadas BIGINT,
  carregamentos_confirmados BIGINT,
  boletos_pendentes BIGINT,
  boletos_vencidos BIGINT,
  valor_pendente NUMERIC,
  valor_vencido NUMERIC,
  ultima_atualizacao_nf TIMESTAMP WITH TIME ZONE,
  ultima_atualizacao_df TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_cliente_id,
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
  WHERE c.id = p_cliente_id AND c.status = 'ativo'
  GROUP BY c.id, c.transportadora_id;
END;
$$;