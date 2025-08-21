-- 1. Criar enum para status das NFs (se não existir)
DO $$ BEGIN
    CREATE TYPE public.nf_status AS ENUM (
      'Armazenada',
      'Ordem Solicitada', 
      'Solicitação Confirmada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar campos de controle sem alterar o tipo status ainda
ALTER TABLE public.notas_fiscais 
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 3. Criar funções de transição atômica mais simples
CREATE OR REPLACE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transportadora_id uuid;
BEGIN
  -- Buscar a transportadora do usuário
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;

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
     AND (transportadora_id = v_transportadora_id OR cliente_id IN (
       SELECT c.id FROM clientes c WHERE c.transportadora_id = v_transportadora_id
     ));
     
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
DECLARE
  v_transportadora_id uuid;
BEGIN
  -- Buscar a transportadora do usuário
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;

  -- Verificar se a NF existe e está no status correto
  UPDATE public.notas_fiscais
     SET status = 'Solicitação Confirmada',
         approved_by = p_user_id,
         approved_at = now(),
         updated_at = now()
   WHERE id = p_nf_id
     AND status = 'Ordem Solicitada'
     AND transportadora_id = v_transportadora_id;
     
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
DECLARE
  v_transportadora_id uuid;
BEGIN
  -- Buscar a transportadora do usuário
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;

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
     AND transportadora_id = v_transportadora_id;
     
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição inválida: só é possível RECUSAR quando status é Ordem Solicitada';  
  END IF;
END;
$$;

-- 4. Habilitar realtime para a tabela notas_fiscais
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;