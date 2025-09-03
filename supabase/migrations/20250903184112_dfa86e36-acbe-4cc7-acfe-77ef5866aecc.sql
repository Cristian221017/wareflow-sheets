-- Corrigir funções com search_path mutable
-- Esta é uma correção das funções existentes com problemas de seguridade

-- Função para validar CPF com search_path fixo
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  -- Remover caracteres não numéricos
  cpf_input := REGEXP_REPLACE(cpf_input, '[^0-9]', '', 'g');
  
  -- Verificar se tem 11 dígitos
  IF LENGTH(cpf_input) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se todos os dígitos são iguais (CPF inválido)
  IF cpf_input ~ '^(.)\1*$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Função para matching de emails com search_path fixo
CREATE OR REPLACE FUNCTION public.email_matches(email1 text, email2 text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  RETURN LOWER(TRIM(email1)) = LOWER(TRIM(email2));
END;
$$;