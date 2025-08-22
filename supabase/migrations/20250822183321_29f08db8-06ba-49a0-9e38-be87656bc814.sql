-- 1) Atualizar dados existentes para valores corretos (CAIXA ALTA)
UPDATE public.notas_fiscais 
SET status = CASE 
  WHEN status IN ('Armazenada', 'armazenada') THEN 'ARMAZENADA'
  WHEN status IN ('Ordem Solicitada', 'Solicitada', 'solicitada') THEN 'SOLICITADA'
  WHEN status IN ('Solicitação Confirmada', 'Confirmada', 'confirmada') THEN 'CONFIRMADA'
  ELSE 'ARMAZENADA'
END;

-- 2) Atualizar default para valor correto
ALTER TABLE public.notas_fiscais ALTER COLUMN status SET DEFAULT 'ARMAZENADA';

-- 3) Publicar tabelas no realtime
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.notas_fiscais,
  public.pedidos_liberacao,
  public.pedidos_liberados;

-- 4) Garantir REPLICA IDENTITY FULL para todas
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos_liberacao REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos_liberados REPLICA IDENTITY FULL;

-- 5) Criar/atualizar RPCs atômicas
CREATE OR REPLACE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_confirmar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_recusar(p_nf_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;