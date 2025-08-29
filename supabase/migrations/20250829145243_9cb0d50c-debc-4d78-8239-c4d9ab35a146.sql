-- Tabela + Policies (idempotente)
CREATE TABLE IF NOT EXISTS public.solicitacoes_carregamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  transportadora_id uuid NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_agendamento timestamptz,
  observacoes text,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'PENDENTE',
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sc_nf ON public.solicitacoes_carregamento(nf_id);
CREATE INDEX IF NOT EXISTS idx_sc_transportadora ON public.solicitacoes_carregamento(transportadora_id);
CREATE INDEX IF NOT EXISTS idx_sc_cliente ON public.solicitacoes_carregamento(cliente_id);

ALTER TABLE public.solicitacoes_carregamento ENABLE ROW LEVEL SECURITY;

-- SELECT cliente
DROP POLICY IF EXISTS sc_select_cliente ON public.solicitacoes_carregamento;
CREATE POLICY sc_select_cliente
ON public.solicitacoes_carregamento FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_clientes uc
    WHERE uc.user_id = auth.uid()
      AND uc.cliente_id = solicitacoes_carregamento.cliente_id
  )
);

-- INSERT cliente (só NF do seu cliente)
DROP POLICY IF EXISTS sc_insert_cliente ON public.solicitacoes_carregamento;
CREATE POLICY sc_insert_cliente
ON public.solicitacoes_carregamento FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_clientes uc
    JOIN public.notas_fiscais nf ON nf.id = solicitacoes_carregamento.nf_id
    WHERE uc.user_id = auth.uid()
      AND uc.cliente_id = solicitacoes_carregamento.cliente_id
      AND nf.cliente_id = solicitacoes_carregamento.cliente_id
  )
);

-- SELECT transportadora / super_admin
DROP POLICY IF EXISTS sc_select_transportadora ON public.solicitacoes_carregamento;
CREATE POLICY sc_select_transportadora
ON public.solicitacoes_carregamento FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.user_transportadoras ut
    WHERE ut.user_id = auth.uid()
      AND ut.is_active = true
      AND ut.transportadora_id = solicitacoes_carregamento.transportadora_id
  )
);

-- UPDATE transportadora (aprovar/recusar)
DROP POLICY IF EXISTS sc_update_transportadora ON public.solicitacoes_carregamento;
CREATE POLICY sc_update_transportadora
ON public.solicitacoes_carregamento FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.user_transportadoras ut
    WHERE ut.user_id = auth.uid()
      AND ut.is_active = true
      AND ut.transportadora_id = solicitacoes_carregamento.transportadora_id
  )
)
WITH CHECK (true);

-- RPC atômica (garantia)
CREATE OR REPLACE FUNCTION public.nf_solicitar_agendamento(
  p_nf_id uuid,
  p_data_agendamento timestamptz,
  p_observacoes text,
  p_anexos jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nf record;
  v_id uuid;
BEGIN
  SELECT nf.id, nf.cliente_id, nf.transportadora_id
  INTO v_nf
  FROM public.notas_fiscais nf
  WHERE nf.id = p_nf_id;

  IF v_nf.id IS NULL THEN
    RAISE EXCEPTION 'NF não encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_clientes uc
    WHERE uc.user_id = auth.uid()
      AND uc.cliente_id = v_nf.cliente_id
  ) THEN
    RAISE EXCEPTION 'Usuário não vinculado ao cliente desta NF';
  END IF;

  INSERT INTO public.solicitacoes_carregamento(
    nf_id, cliente_id, transportadora_id,
    data_agendamento, observacoes, anexos, status, requested_by
  ) VALUES (
    p_nf_id, v_nf.cliente_id, v_nf.transportadora_id,
    p_data_agendamento, p_observacoes, COALESCE(p_anexos,'[]'::jsonb),
    'PENDENTE', auth.uid()
  )
  RETURNING id INTO v_id;

  UPDATE public.notas_fiscais
  SET status = 'SOLICITADA',
      requested_by = auth.uid(),
      requested_at = now()
  WHERE id = p_nf_id;

  PERFORM public.log_system_event(
    'NF','SOLICITADA','INFO',
    'Solicitação com agendamento criada',
    p_nf_id, v_nf.transportadora_id, v_nf.cliente_id,
    jsonb_build_object(
      'nfId', p_nf_id,
      'solicitacaoId', v_id,
      'data_agendamento', p_data_agendamento,
      'has_anexos', jsonb_typeof(COALESCE(p_anexos,'[]'::jsonb)) = 'array'
    )
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_solicitar_agendamento(uuid,timestamptz,text,jsonb) TO authenticated;

-- Criar bucket para anexos se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('solicitacoes-anexos', 'solicitacoes-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket solicitacoes-anexos
CREATE POLICY "Cliente pode fazer upload de anexos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'solicitacoes-anexos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Cliente pode ver seus anexos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'solicitacoes-anexos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Transportadora pode ver anexos de suas solicitações" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM public.user_transportadoras ut
    JOIN public.solicitacoes_carregamento sc ON sc.transportadora_id = ut.transportadora_id
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
    AND (storage.foldername(name))[2] = sc.nf_id::text
  )
);