-- 1. Criar enum para status das NFs
CREATE TYPE public.nf_status AS ENUM (
  'Armazenada',
  'Ordem Solicitada', 
  'Solicitação Confirmada'
);

-- 2. Alterar tabela notas_fiscais para usar o enum e adicionar campos de controle
ALTER TABLE public.notas_fiscais 
  ALTER COLUMN status TYPE nf_status USING status::nf_status,
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 3. Criar funções de transição atômica para evitar estados inválidos
CREATE OR REPLACE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se a NF existe e está no status correto
  UPDATE public.notas_fiscais
     SET status = 'Ordem Solicitada',
         requested_by = p_user_id,
         requested_at = now(),
         approved_by = null,
         approved_at = null,
         updated_at = now()
   WHERE id = p_nf_id
     AND status = 'Armazenada'
     AND transportadora_id = get_user_transportadora(p_user_id);
     
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível SOLICITAR quando status é Armazenada';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_confirmar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se a NF existe e está no status correto
  UPDATE public.notas_fiscais
     SET status = 'Solicitação Confirmada',
         approved_by = p_user_id,
         approved_at = now(),
         updated_at = now()
   WHERE id = p_nf_id
     AND status = 'Ordem Solicitada'
     AND transportadora_id = get_user_transportadora(p_user_id);
     
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível CONFIRMAR quando status é Ordem Solicitada';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_recusar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se a NF existe e está no status correto
  UPDATE public.notas_fiscais
     SET status = 'Armazenada',
         approved_by = null,
         approved_at = null,
         requested_by = null,
         requested_at = null,
         updated_at = now()
   WHERE id = p_nf_id
     AND status = 'Ordem Solicitada'
     AND transportadora_id = get_user_transportadora(p_user_id);
     
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível RECUSAR quando status é Ordem Solicitada';  
  END IF;
END;
$$;

-- 4. Habilitar realtime para a tabela notas_fiscais
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_fiscais;