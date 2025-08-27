-- Segunda parte: Corrigir funções restantes sem search_path

-- Identificar e corrigir todas as funções que ainda não têm search_path
-- Vou atualizar as funções que ainda aparecem na lista

-- Verificar se alguma função trigger precisa de correção
CREATE OR REPLACE FUNCTION public.validate_status_separacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se status não é ARMAZENADA, resetar status_separacao para pendente
  IF NEW.status != 'ARMAZENADA' THEN
    NEW.status_separacao := 'pendente';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Corrigir função trigger para dashboards
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

-- Corrigir função de validação de tenant
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

-- Corrigir função de trigger para auto linking
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

-- Corrigir função de normalização de email
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

-- Corrigir função set_updated_at
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