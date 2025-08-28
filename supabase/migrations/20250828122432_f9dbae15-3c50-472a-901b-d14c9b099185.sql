-- Recriar o trigger para preservar status de separação
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
DROP TRIGGER IF EXISTS validate_status_separacao_trigger ON public.notas_fiscais;
CREATE TRIGGER validate_status_separacao_trigger
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_separacao();

-- Corrigir a NF 85475522 especificamente
UPDATE notas_fiscais 
SET status_separacao = 'separacao_concluida',
    updated_at = now()
WHERE numero_nf = '85475522' 
  AND status = 'CONFIRMADA' 
  AND status_separacao = 'pendente';