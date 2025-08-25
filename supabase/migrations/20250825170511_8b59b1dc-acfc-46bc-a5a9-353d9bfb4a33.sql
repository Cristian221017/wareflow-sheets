-- Grant execution permission for authenticated users
GRANT EXECUTE ON FUNCTION public.set_financeiro_file_path(uuid, text, text) TO authenticated;

-- Update function to be resilient to missing log functions and set proper search path
CREATE OR REPLACE FUNCTION public.set_financeiro_file_path(
  p_doc_id uuid,
  p_kind text,
  p_path text
) RETURNS public.documentos_financeiros
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
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

  -- Try to log event, but don't fail if log functions don't exist
  BEGIN
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
  EXCEPTION
    WHEN undefined_function OR undefined_table THEN
      -- Log functions not installed yet: ignore
      NULL;
  END;

  RETURN v_doc;
END $$;