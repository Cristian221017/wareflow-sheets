-- Corrigir status das NFs para o padrão correto (maiúsculo)
UPDATE notas_fiscais 
SET status = 'ARMAZENADA' 
WHERE status = 'Armazenada';

-- Remover todas as NFs de exemplo (DEV-*)
DELETE FROM notas_fiscais 
WHERE numero_nf LIKE 'DEV-%';

-- Remover clientes de exemplo (baseado no CNPJ demo)
DELETE FROM clientes 
WHERE cnpj = '98.765.432/0001-10';

-- Atualizar constraint do status para usar apenas maiúsculo
ALTER TABLE notas_fiscais 
DROP CONSTRAINT IF EXISTS notas_fiscais_status_check;

ALTER TABLE notas_fiscais 
ADD CONSTRAINT notas_fiscais_status_check 
CHECK (status IN ('ARMAZENADA', 'SOLICITADA', 'CONFIRMADA'));