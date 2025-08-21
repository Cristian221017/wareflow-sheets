-- Função para padronizar emails (sempre lowercase e trim)
CREATE OR REPLACE FUNCTION normalize_email()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar triggers para padronização automática de emails
DROP TRIGGER IF EXISTS normalize_email_clientes ON clientes;
CREATE TRIGGER normalize_email_clientes
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION normalize_email();

DROP TRIGGER IF EXISTS normalize_email_profiles ON profiles;
CREATE TRIGGER normalize_email_profiles
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_email();

DROP TRIGGER IF EXISTS normalize_email_transportadoras ON transportadoras;
CREATE TRIGGER normalize_email_transportadoras
  BEFORE INSERT OR UPDATE ON transportadoras
  FOR EACH ROW
  EXECUTE FUNCTION normalize_email();

-- Padronizar todos os emails existentes
UPDATE clientes SET 
  email = LOWER(TRIM(email)),
  email_nota_fiscal = CASE WHEN email_nota_fiscal IS NOT NULL THEN LOWER(TRIM(email_nota_fiscal)) ELSE NULL END,
  email_solicitacao_liberacao = CASE WHEN email_solicitacao_liberacao IS NOT NULL THEN LOWER(TRIM(email_solicitacao_liberacao)) ELSE NULL END,
  email_liberacao_autorizada = CASE WHEN email_liberacao_autorizada IS NOT NULL THEN LOWER(TRIM(email_liberacao_autorizada)) ELSE NULL END,
  email_notificacao_boleto = CASE WHEN email_notificacao_boleto IS NOT NULL THEN LOWER(TRIM(email_notificacao_boleto)) ELSE NULL END;

UPDATE profiles SET 
  email = LOWER(TRIM(email));

UPDATE transportadoras SET 
  email = LOWER(TRIM(email));

-- Função adicional para comparação case-insensitive de emails em consultas
CREATE OR REPLACE FUNCTION email_matches(email1 text, email2 text)
RETURNS boolean AS $$
BEGIN
  RETURN LOWER(TRIM(email1)) = LOWER(TRIM(email2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;