-- Corrigir políticas de segurança das tabelas públicas

-- 1. Restringir acesso à tabela system_health_checks
DROP POLICY IF EXISTS "Everyone can view health checks" ON public.system_health_checks;

CREATE POLICY "Admins can view health checks" ON public.system_health_checks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.role IN ('super_admin', 'admin_transportadora')
    AND ut.is_active = true
  )
);

-- 2. Restringir acesso à tabela feature_flags (já existe política, mas vamos reforçar)
-- Já está restrita corretamente

-- 3. Restringir acesso à tabela status_mappings
DROP POLICY IF EXISTS "Users can view status mappings" ON public.status_mappings;

CREATE POLICY "Users can view status mappings" ON public.status_mappings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
  )
);

-- 4. Criar função RPC faltante para atualização de status de separação
CREATE OR REPLACE FUNCTION public.nf_update_status_separacao(
  p_nf_id uuid,
  p_status_separacao text,
  p_observacoes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nf_info RECORD;
  v_user_id uuid;
  v_user_role text;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar informações da NF
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
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  -- Verificar permissões - apenas transportadoras podem atualizar status de separação
  IF NOT (v_user_role IN ('admin_transportadora', 'super_admin', 'operador')) THEN
    RAISE EXCEPTION 'Apenas transportadoras podem alterar status de separação';
  END IF;

  -- Atualizar status de separação
  UPDATE public.notas_fiscais
  SET status_separacao = p_status_separacao::separacao_status,
      updated_at = now()
  WHERE id = p_nf_id;

  -- Registrar evento no log
  PERFORM log_system_event(
    'NF', 'STATUS_SEPARACAO_UPDATED', 'INFO',
    'Status de separação atualizado',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_separacao_novo', p_status_separacao,
      'observacoes', p_observacoes
    )
  );
END;
$function$;

-- 5. Corrigir funções existentes para ter search_path seguro
-- (Algumas já estão corretas, vamos focar nas que precisam de correção)

CREATE OR REPLACE FUNCTION public.get_user_transportadora(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_id uuid;
BEGIN
  SELECT ut.transportadora_id INTO result_id
  FROM user_transportadoras ut
  WHERE ut.user_id = _user_id
    AND ut.is_active = true
  LIMIT 1;
  
  RETURN result_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = _user_id 
    AND ut.role = _role
    AND ut.is_active = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.email_matches(email1 text, email2 text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LOWER(TRIM(email1)) = LOWER(TRIM(email2));
END;
$function$;