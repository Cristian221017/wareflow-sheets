-- Corrigir trigger que impede atualização de status de separação
DROP TRIGGER IF EXISTS validate_status_separacao_trigger ON public.notas_fiscais;

-- Recriar função com lógica corrigida
CREATE OR REPLACE FUNCTION public.validate_status_separacao()
RETURNS trigger
LANGUAGE plpgsql
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

-- Recriar o trigger
CREATE TRIGGER validate_status_separacao_trigger
BEFORE UPDATE ON public.notas_fiscais
FOR EACH ROW
EXECUTE FUNCTION public.validate_status_separacao();