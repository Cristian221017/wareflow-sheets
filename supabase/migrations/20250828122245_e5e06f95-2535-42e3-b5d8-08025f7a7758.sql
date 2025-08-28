-- Corrigir NFs que estão CONFIRMADAS mas com separacao pendente
-- Estas NFs deveriam manter o status de separação que tinham

UPDATE notas_fiscais 
SET status_separacao = 'separacao_concluida',
    updated_at = now()
WHERE status IN ('CONFIRMADA', 'SOLICITADA') 
  AND status_separacao = 'pendente'
  AND numero_nf IN ('85475522');

-- Verificar se existem outras NFs com o mesmo problema
-- e log para análise
SELECT numero_nf, status, status_separacao, updated_at 
FROM notas_fiscais 
WHERE status IN ('CONFIRMADA', 'SOLICITADA') 
  AND status_separacao = 'pendente';