-- Event log para auditoria completa
CREATE TABLE public.event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id UUID DEFAULT gen_random_uuid()
);

-- Índices para performance
CREATE INDEX idx_event_log_actor_id ON public.event_log(actor_id);
CREATE INDEX idx_event_log_entity ON public.event_log(entity_type, entity_id);
CREATE INDEX idx_event_log_created_at ON public.event_log(created_at DESC);
CREATE INDEX idx_event_log_event_type ON public.event_log(event_type);

-- RLS para event_log
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Super admins podem ver tudo
CREATE POLICY "Super admins can view all events" 
ON public.event_log 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::user_role));

-- Transportadoras veem eventos de suas entidades
CREATE POLICY "Transportadoras can view their events" 
ON public.event_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
    AND (
      -- Eventos relacionados a NFs da transportadora
      (entity_type = 'nota_fiscal' AND EXISTS (
        SELECT 1 FROM notas_fiscais nf 
        WHERE nf.id = event_log.entity_id 
        AND nf.transportadora_id = ut.transportadora_id
      ))
      OR
      -- Eventos relacionados a documentos financeiros da transportadora  
      (entity_type = 'documento_financeiro' AND EXISTS (
        SELECT 1 FROM documentos_financeiros df
        WHERE df.id = event_log.entity_id
        AND df.transportadora_id = ut.transportadora_id
      ))
      OR 
      -- Eventos relacionados a clientes da transportadora
      (entity_type = 'cliente' AND EXISTS (
        SELECT 1 FROM clientes c
        WHERE c.id = event_log.entity_id
        AND c.transportadora_id = ut.transportadora_id
      ))
    )
  )
);

-- Clientes veem apenas eventos relacionados a eles
CREATE POLICY "Clientes can view their events" 
ON public.event_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
    AND c.status = 'ativo'
    AND (
      -- Eventos relacionados a NFs do cliente
      (entity_type = 'nota_fiscal' AND EXISTS (
        SELECT 1 FROM notas_fiscais nf 
        WHERE nf.id = event_log.entity_id 
        AND nf.cliente_id = c.id
      ))
      OR
      -- Eventos relacionados a documentos financeiros do cliente
      (entity_type = 'documento_financeiro' AND EXISTS (
        SELECT 1 FROM documentos_financeiros df
        WHERE df.id = event_log.entity_id
        AND df.cliente_id = c.id
      ))
    )
  )
);

-- Função para registrar eventos
CREATE OR REPLACE FUNCTION public.log_event(
  p_actor_id UUID,
  p_actor_role TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.event_log (
    actor_id, actor_role, entity_type, entity_id, event_type, payload
  ) VALUES (
    p_actor_id, p_actor_role, p_entity_type, p_entity_id, p_event_type, p_payload
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Melhorar função nf_solicitar para incluir log
CREATE OR REPLACE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF e role do usuário
  SELECT status, numero_nf, cliente_id, transportadora_id 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
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

  -- Executar transição
  UPDATE public.notas_fiscais
  SET status = 'SOLICITADA',
      requested_by = p_user_id,
      requested_at = now(),
      approved_by = null,
      approved_at = null,
      updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'ARMAZENADA';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível SOLICITAR quando status é ARMAZENADA';
  END IF;
  
  -- Log do evento
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'solicitacao_carregamento',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'ARMAZENADA',
      'status_novo', 'SOLICITADA',
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id
    )
  );
END;
$$;

-- Melhorar função nf_confirmar para incluir log
CREATE OR REPLACE FUNCTION public.nf_confirmar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF e role do usuário
  SELECT status, numero_nf, cliente_id, transportadora_id, requested_by 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
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

  -- Executar transição
  UPDATE public.notas_fiscais
  SET status = 'CONFIRMADA',
      approved_by = p_user_id,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'SOLICITADA';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível CONFIRMAR quando status é SOLICITADA';
  END IF;
  
  -- Log do evento
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'confirmacao_carregamento',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'SOLICITADA',
      'status_novo', 'CONFIRMADA',
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id,
      'solicitante_id', v_nf_info.requested_by
    )
  );
END;
$$;

-- Melhorar função nf_recusar para incluir log
CREATE OR REPLACE FUNCTION public.nf_recusar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Buscar informações da NF e role do usuário
  SELECT status, numero_nf, cliente_id, transportadora_id, requested_by 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
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

  -- Executar transição
  UPDATE public.notas_fiscais
  SET status = 'ARMAZENADA',
      requested_by = null,
      requested_at = null,
      approved_by = null,
      approved_at = null,
      updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'SOLICITADA';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível RECUSAR quando status é SOLICITADA';
  END IF;
  
  -- Log do evento
  PERFORM log_event(
    p_user_id,
    v_user_role,
    'nota_fiscal',
    p_nf_id,
    'recusa_carregamento',
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', 'SOLICITADA',
      'status_novo', 'ARMAZENADA',
      'cliente_id', v_nf_info.cliente_id,
      'transportadora_id', v_nf_info.transportadora_id,
      'solicitante_id', v_nf_info.requested_by
    )
  );
END;
$$;

-- Índices críticos para performance
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_transportadora_status ON public.notas_fiscais(transportadora_id, status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cliente_status ON public.notas_fiscais(cliente_id, status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_created_at ON public.notas_fiscais(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documentos_financeiros_status ON public.documentos_financeiros(status);
CREATE INDEX IF NOT EXISTS idx_documentos_financeiros_transportadora ON public.documentos_financeiros(transportadora_id);
CREATE INDEX IF NOT EXISTS idx_documentos_financeiros_cliente ON public.documentos_financeiros(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_financeiros_vencimento ON public.documentos_financeiros(data_vencimento);

-- Habilitar realtime para event_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_log;