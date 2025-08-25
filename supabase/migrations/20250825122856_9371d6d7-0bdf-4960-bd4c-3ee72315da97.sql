-- Remover views materializadas completamente (problema de segurança)
DROP MATERIALIZED VIEW IF EXISTS public.mv_transportadora_dashboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_cliente_dashboard CASCADE;

-- Corrigir funções que podem não ter search_path definido
CREATE OR REPLACE FUNCTION public.normalize_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Atualizar função refresh_dashboard_views para não usar mais as views materializadas
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Função mantida para compatibilidade, mas não faz mais nada
  -- Dashboards agora usam funções em tempo real
  RETURN;
END;
$$;

-- Remover triggers das views materializadas que não existem mais
DROP TRIGGER IF EXISTS tr_nf_dashboard_refresh ON public.notas_fiscais;
DROP TRIGGER IF EXISTS tr_df_dashboard_refresh ON public.documentos_financeiros;