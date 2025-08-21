-- Limpar qualquer referência específica ao fluxo de NFs
-- Reverter status da tabela notas_fiscais para apenas 'Armazenada' como padrão
UPDATE notas_fiscais SET status = 'Armazenada' WHERE status IN ('Ordem Solicitada', 'Solicitação Confirmada');

-- Comentário: Todas as referências ao fluxo de NFs foram removidas do código.
-- O sistema agora usa apenas o status básico 'Armazenada' para notas fiscais.