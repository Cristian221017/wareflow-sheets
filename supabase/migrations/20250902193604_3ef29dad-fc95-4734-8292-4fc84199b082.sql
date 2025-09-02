-- Adicionar campos CPF e setor à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS setor TEXT;

-- Criar função para validar CPF (simples validação de formato)
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
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