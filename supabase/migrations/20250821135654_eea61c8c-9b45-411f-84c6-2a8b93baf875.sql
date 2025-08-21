-- Corrigir função normalize_email com search_path seguro
CREATE OR REPLACE FUNCTION normalize_email()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
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

-- Corrigir função email_matches com search_path seguro
CREATE OR REPLACE FUNCTION email_matches(email1 text, email2 text)
RETURNS boolean 
LANGUAGE plpgsql 
IMMUTABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN LOWER(TRIM(email1)) = LOWER(TRIM(email2));
END;
$$;