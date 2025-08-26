-- Teste simples: tentar inserir um log diretamente (deve funcionar com a nova política)
INSERT INTO system_logs (entity_type, action, status, message) 
VALUES ('TEST', 'MANUAL_TEST', 'INFO', 'Teste manual do sistema de logs após correção RLS');