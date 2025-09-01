-- Melhorias no sistema WMS: financeiro, fluxo e dashboards

-- 1. Financeiro: adicionar colunas de pagamento
ALTER TABLE public.documentos_financeiros 
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(14,2) NULL;

-- Índices úteis para financeiro
CREATE INDEX IF NOT EXISTS idx_docfin_pendente ON public.documentos_financeiros (data_vencimento)
  WHERE pago_em IS NULL;

-- 2. Fluxo: tabela de eventos para embarque/entrega
CREATE TABLE IF NOT EXISTS public.nf_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('EMBARQUE_CONFIRMADO','ENTREGA_CONFIRMADA')),
  data_evento TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes TEXT NULL,
  anexos JSONB NOT NULL DEFAULT '[]',
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nf_eventos_nf ON public.nf_eventos(nf_id);
CREATE INDEX IF NOT EXISTS idx_nf_eventos_tipo ON public.nf_eventos(tipo);

-- Habilitar RLS na tabela de eventos
ALTER TABLE public.nf_eventos ENABLE ROW LEVEL SECURITY;

-- Policy para transportadoras verem eventos de suas NFs
CREATE POLICY "Transportadoras podem ver eventos de suas NFs" ON public.nf_eventos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.user_transportadoras ut ON ut.transportadora_id = nf.transportadora_id
      WHERE nf.id = nf_eventos.nf_id 
        AND ut.user_id = auth.uid() 
        AND ut.is_active = true
    )
  );

-- Policy para inserir eventos
CREATE POLICY "Transportadoras podem inserir eventos" ON public.nf_eventos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais nf
      JOIN public.user_transportadoras ut ON ut.transportadora_id = nf.transportadora_id
      WHERE nf.id = nf_eventos.nf_id 
        AND ut.user_id = auth.uid() 
        AND ut.is_active = true
    )
  );

-- 3. Espelho na NF para facilitar consultas
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS data_embarque TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS data_entrega TIMESTAMPTZ NULL;

-- 4. Functions para confirmar embarque/entrega
CREATE OR REPLACE FUNCTION public.nf_confirmar_embarque(
  p_nf_id UUID,
  p_data TIMESTAMPTZ DEFAULT now(),
  p_observacoes TEXT DEFAULT NULL,
  p_anexos JSONB DEFAULT '[]'
) RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir evento
  INSERT INTO public.nf_eventos (nf_id, tipo, data_evento, observacoes, anexos, created_by)
  VALUES (p_nf_id, 'EMBARQUE_CONFIRMADO', COALESCE(p_data, now()), p_observacoes, COALESCE(p_anexos,'[]'::jsonb), auth.uid());
  
  -- Atualizar NF
  UPDATE public.notas_fiscais 
  SET data_embarque = COALESCE(p_data, now()),
      updated_at = now()
  WHERE id = p_nf_id;
  
  -- Log do evento
  PERFORM log_system_event(
    'NF', 'EMBARQUE_CONFIRMADO', 'INFO',
    'Embarque confirmado com sucesso',
    p_nf_id, NULL, NULL,
    jsonb_build_object(
      'data_embarque', COALESCE(p_data, now()),
      'observacoes', p_observacoes,
      'anexos_count', jsonb_array_length(COALESCE(p_anexos,'[]'::jsonb))
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_confirmar_entrega(
  p_nf_id UUID,
  p_data TIMESTAMPTZ DEFAULT now(),
  p_observacoes TEXT DEFAULT NULL,
  p_anexos JSONB DEFAULT '[]'
) RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir evento
  INSERT INTO public.nf_eventos (nf_id, tipo, data_evento, observacoes, anexos, created_by)
  VALUES (p_nf_id, 'ENTREGA_CONFIRMADA', COALESCE(p_data, now()), p_observacoes, COALESCE(p_anexos,'[]'::jsonb), auth.uid());
  
  -- Atualizar NF
  UPDATE public.notas_fiscais 
  SET data_entrega = COALESCE(p_data, now()),
      updated_at = now()
  WHERE id = p_nf_id;
  
  -- Log do evento
  PERFORM log_system_event(
    'NF', 'ENTREGA_CONFIRMADA', 'INFO',
    'Entrega confirmada com sucesso',
    p_nf_id, NULL, NULL,
    jsonb_build_object(
      'data_entrega', COALESCE(p_data, now()),
      'observacoes', p_observacoes,
      'anexos_count', jsonb_array_length(COALESCE(p_anexos,'[]'::jsonb))
    )
  );
END;
$$;