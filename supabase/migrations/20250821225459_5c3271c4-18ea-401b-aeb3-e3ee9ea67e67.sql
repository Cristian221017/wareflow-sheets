-- 1. Corrigir enum para usar nomes exatos especificados
DROP TYPE IF EXISTS public.nf_status CASCADE;
CREATE TYPE public.nf_status AS ENUM ('ARMAZENADA', 'SOLICITADA', 'CONFIRMADA');

-- 2. Alterar tabela notas_fiscais para usar o enum correto
ALTER TABLE public.notas_fiscais 
  DROP COLUMN IF EXISTS status CASCADE;

ALTER TABLE public.notas_fiscais 
  ADD COLUMN status nf_status NOT NULL DEFAULT 'ARMAZENADA',
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 3. Recriar RPCs com validações rigorosas e logs
CREATE OR REPLACE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status nf_status;
  v_owner_check boolean := false;
BEGIN
  -- Log da tentativa
  RAISE NOTICE '[FLOW] Tentativa de solicitar NF % por usuário %', p_nf_id, p_user_id;
  
  -- Verificar se a NF existe e obter status atual
  SELECT nf.status INTO v_current_status
  FROM public.notas_fiscais nf
  WHERE nf.id = p_nf_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NF não encontrada com ID %', p_nf_id;
  END IF;
  
  -- Verificar se usuário tem permissão (cliente da NF ou cliente da transportadora)
  SELECT EXISTS (
    SELECT 1 FROM public.notas_fiscais nf
    JOIN public.clientes c ON c.id = nf.cliente_id
    JOIN public.profiles p ON p.email = c.email
    WHERE nf.id = p_nf_id AND p.user_id = p_user_id
  ) INTO v_owner_check;
  
  IF NOT v_owner_check THEN
    RAISE EXCEPTION 'Usuário não tem permissão para solicitar esta NF';
  END IF;
  
  -- Verificar estado atual
  IF v_current_status != 'ARMAZENADA' THEN
    RAISE EXCEPTION 'Transição inválida: NF deve estar ARMAZENADA para ser solicitada. Status atual: %', v_current_status;
  END IF;
  
  -- Atualizar status de forma atômica
  UPDATE public.notas_fiscais
  SET 
    status = 'SOLICITADA',
    requested_by = p_user_id,
    requested_at = now(),
    approved_by = null,
    approved_at = null,
    updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'ARMAZENADA'; -- Dupla verificação para evitar race conditions
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha na atualização: NF pode ter mudado de status durante a operação';
  END IF;
  
  RAISE NOTICE '[FLOW] NF % solicitada com sucesso por %', p_nf_id, p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_confirmar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status nf_status;
  v_transportadora_id uuid;
BEGIN
  RAISE NOTICE '[FLOW] Tentativa de confirmar NF % por usuário %', p_nf_id, p_user_id;
  
  -- Obter transportadora do usuário
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id 
    AND ut.is_active = true
    AND ut.role IN ('admin_transportadora', 'operador')
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem permissão de transportadora para confirmar NFs';
  END IF;
  
  -- Verificar se a NF pertence à transportadora do usuário
  SELECT nf.status INTO v_current_status
  FROM public.notas_fiscais nf
  WHERE nf.id = p_nf_id AND nf.transportadora_id = v_transportadora_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NF não encontrada ou não pertence à transportadora do usuário';
  END IF;
  
  IF v_current_status != 'SOLICITADA' THEN
    RAISE EXCEPTION 'Transição inválida: NF deve estar SOLICITADA para ser confirmada. Status atual: %', v_current_status;
  END IF;
  
  -- Atualizar status de forma atômica
  UPDATE public.notas_fiscais
  SET 
    status = 'CONFIRMADA',
    approved_by = p_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'SOLICITADA'
    AND transportadora_id = v_transportadora_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha na confirmação: NF pode ter mudado de status durante a operação';
  END IF;
  
  RAISE NOTICE '[FLOW] NF % confirmada com sucesso por %', p_nf_id, p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nf_recusar(p_nf_id uuid, p_user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status nf_status;
  v_transportadora_id uuid;
BEGIN
  RAISE NOTICE '[FLOW] Tentativa de recusar NF % por usuário %', p_nf_id, p_user_id;
  
  -- Obter transportadora do usuário
  SELECT ut.transportadora_id INTO v_transportadora_id
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id 
    AND ut.is_active = true
    AND ut.role IN ('admin_transportadora', 'operador')
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem permissão de transportadora para recusar NFs';
  END IF;
  
  -- Verificar se a NF pertence à transportadora do usuário
  SELECT nf.status INTO v_current_status
  FROM public.notas_fiscais nf
  WHERE nf.id = p_nf_id AND nf.transportadora_id = v_transportadora_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NF não encontrada ou não pertence à transportadora do usuário';
  END IF;
  
  IF v_current_status != 'SOLICITADA' THEN
    RAISE EXCEPTION 'Transição inválida: NF deve estar SOLICITADA para ser recusada. Status atual: %', v_current_status;
  END IF;
  
  -- Recusar de forma atômica (volta para ARMAZENADA)
  UPDATE public.notas_fiscais
  SET 
    status = 'ARMAZENADA',
    approved_by = null,
    approved_at = null,
    requested_by = null,
    requested_at = null,
    updated_at = now()
  WHERE id = p_nf_id 
    AND status = 'SOLICITADA'
    AND transportadora_id = v_transportadora_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha na recusa: NF pode ter mudado de status durante a operação';
  END IF;
  
  RAISE NOTICE '[FLOW] NF % recusada com sucesso por %', p_nf_id, p_user_id;
END;
$$;

-- 4. Atualizar tipos no database.types.ts
COMMENT ON TYPE public.nf_status IS 'Status das NFs: ARMAZENADA, SOLICITADA, CONFIRMADA';

-- 5. Habilitar realtime se não estiver
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;