-- 1. Garantir column updated_at existe
ALTER TABLE public.documentos_financeiros 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Criar função para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- 3. Criar trigger para updated_at
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.documentos_financeiros;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.documentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Policy de UPDATE para transportadora (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='documentos_financeiros'
      AND policyname='Transportadora atualiza seus documentos financeiros'
  ) THEN
    CREATE POLICY "Transportadora atualiza seus documentos financeiros"
    ON public.documentos_financeiros
    FOR UPDATE TO authenticated
    USING (transportadora_id = public.get_user_transportadora(auth.uid()))
    WITH CHECK (transportadora_id = public.get_user_transportadora(auth.uid()));
  END IF;
END $$;

-- 5. RPC para consolidar update no servidor
CREATE OR REPLACE FUNCTION public.set_financeiro_file_path(
  p_doc_id uuid,
  p_kind text,          -- 'boleto' | 'cte'
  p_path text
) RETURNS public.documentos_financeiros
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE 
  v_doc public.documentos_financeiros;
BEGIN
  IF p_kind NOT IN ('boleto','cte') THEN
    RAISE EXCEPTION 'Tipo inválido: %', p_kind;
  END IF;

  UPDATE public.documentos_financeiros
    SET arquivo_boleto_path = CASE WHEN p_kind='boleto' THEN p_path ELSE arquivo_boleto_path END,
        arquivo_cte_path    = CASE WHEN p_kind='cte'    THEN p_path ELSE arquivo_cte_path END,
        updated_at = now()
  WHERE id = p_doc_id
    AND transportadora_id = public.get_user_transportadora(auth.uid())
  RETURNING * INTO v_doc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma linha atualizada (docId inválido ou RLS)';
  END IF;

  -- Log do evento
  PERFORM public.log_event(
    auth.uid(),
    'admin_transportadora',
    'documento_financeiro',
    p_doc_id,
    'arquivo_anexado',
    jsonb_build_object(
      'tipo_arquivo', p_kind, 
      'path', p_path,
      'numero_cte', v_doc.numero_cte
    )
  );

  RETURN v_doc;
END $$;