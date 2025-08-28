-- Corrigir trigger para preservar status de separação concluída durante fluxo
-- O status de separação concluída deve ser mantido mesmo quando NF sai de ARMAZENADA

DROP TRIGGER IF EXISTS validate_status_separacao_trigger ON public.notas_fiscais;

-- Novo trigger que preserva separacao_concluida
CREATE OR REPLACE FUNCTION public.validate_status_separacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- IMPORTANTE: Preservar status de separação concluída mesmo quando sai de ARMAZENADA
  -- Só resetar para pendente se ainda não foi separado ou se voltando via recusa
  
  IF NEW.status != 'ARMAZENADA' THEN
    -- Se separação estava concluída, MANTER durante todo o fluxo
    IF OLD.status_separacao = 'separacao_concluida' THEN
      NEW.status_separacao := 'separacao_concluida';
    -- Para outros status de separação, manter também (em_separacao, com_pendencia)
    ELSIF OLD.status_separacao IN ('em_separacao', 'separacao_com_pendencia') THEN
      NEW.status_separacao := OLD.status_separacao;
    -- Só resetar para pendente se estava pendente
    ELSE
      NEW.status_separacao := 'pendente';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER validate_status_separacao_trigger
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_separacao();

-- Atualizar comentário
COMMENT ON FUNCTION public.validate_status_separacao IS 'Valida e preserva status de separação. Status separacao_concluida é preservado durante todo o fluxo da NF.';