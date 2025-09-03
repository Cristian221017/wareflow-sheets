-- Fix database function search paths for security
-- This prevents potential SQL injection through search_path manipulation

-- Update all functions that don't have SET search_path
CREATE OR REPLACE FUNCTION public.atualizar_status_vencidos()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.documentos_financeiros 
  SET status = 'Vencido', updated_at = now()
  WHERE data_vencimento < CURRENT_DATE 
  AND status = 'Em aberto';
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transportadora_with_admin(p_transportadora_data jsonb, p_admin_email text, p_admin_password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transportadora_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Create transportadora
  INSERT INTO public.transportadoras (
    razao_social, nome_fantasia, cnpj, email, telefone, endereco,
    cidade, estado, cep, status, plano, limite_usuarios, limite_clientes, data_contrato
  )
  VALUES (
    p_transportadora_data->>'razao_social',
    p_transportadora_data->>'nome_fantasia', 
    p_transportadora_data->>'cnpj',
    p_admin_email,
    p_transportadora_data->>'telefone',
    p_transportadora_data->>'endereco',
    p_transportadora_data->>'cidade',
    p_transportadora_data->>'estado',
    p_transportadora_data->>'cep',
    (p_transportadora_data->>'status')::text,
    (p_transportadora_data->>'plano')::text,
    (p_transportadora_data->>'limite_usuarios')::integer,
    (p_transportadora_data->>'limite_clientes')::integer,
    CASE 
      WHEN p_transportadora_data->>'data_contrato' = '' THEN NULL
      ELSE (p_transportadora_data->>'data_contrato')::date
    END
  )
  RETURNING id INTO v_transportadora_id;

  -- 2. Create admin user in auth
  SELECT id INTO v_user_id
  FROM auth.users 
  WHERE email = p_admin_email;
  
  -- If user doesn't exist, we'll create association when they first sign up
  -- The trigger will handle the association
  
  RETURN v_transportadora_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_nf_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT transportadora_id FROM public.clientes WHERE id = NEW.cliente_id)
     <> NEW.transportadora_id THEN
    RAISE EXCEPTION 'Cliente não pertence à transportadora desta NF';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_dashboards()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Usar pg_notify para refresh assíncrono
  PERFORM pg_notify('dashboard_refresh', 'update');
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_link_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Tentar criar vínculo automaticamente
  PERFORM public.create_user_cliente_link_by_email(NEW.email);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Para tabela clientes
  IF TG_TABLE_NAME = 'clientes' THEN
    NEW.email = LOWER(TRIM(NEW.email));
    IF NEW.email_nota_fiscal IS NOT NULL THEN
      NEW.email_nota_fiscal = LOWER(TRIM(NEW.email_nota_fiscal));
    END IF;
    IF NEW.email_solicitacao_liberacao IS NOT NULL THEN
      NEW.email_solicitacao_liberacao = LOWER(TRIM(NEW.email_solicitacao_liberacao));
    END IF;
    IF NEW.email_liberacao_autorizada IS NOT NULL THEN
      NEW.email_liberacao_autorizada = LOWER(TRIM(NEW.email_liberacao_autorizada));
    END IF;
    IF NEW.email_notificacao_boleto IS NOT NULL THEN
      NEW.email_notificacao_boleto = LOWER(TRIM(NEW.email_notificacao_boleto));
    END IF;
  END IF;

  -- Para tabela profiles
  IF TG_TABLE_NAME = 'profiles' THEN
    NEW.email = LOWER(TRIM(NEW.email));
  END IF;

  -- Para tabela transportadoras
  IF TG_TABLE_NAME = 'transportadoras' THEN
    NEW.email = LOWER(TRIM(NEW.email));
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_status_separacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- IMPORTANTE: Permitir alteração de status de separação quando NF está CONFIRMADA
  -- Só preservar automaticamente durante mudanças de status da NF (não mudanças manuais do status_separacao)
  
  -- Se estamos apenas atualizando o status_separacao manualmente, permitir
  IF (OLD.status_separacao != NEW.status_separacao AND OLD.status = NEW.status) THEN
    -- É uma atualização manual do status de separação, permitir
    RETURN NEW;
  END IF;
  
  -- Lógica original apenas para mudanças de status da NF
  IF OLD.status != NEW.status THEN
    -- Se saindo de ARMAZENADA, preservar status de separação apenas se voltando para ARMAZENADA
    IF NEW.status = 'ARMAZENADA' AND OLD.status != 'ARMAZENADA' THEN
      -- Voltando para armazenada (ex: recusa), resetar para pendente apenas se não estava concluída
      IF OLD.status_separacao != 'separacao_concluida' THEN
        NEW.status_separacao := 'pendente';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;