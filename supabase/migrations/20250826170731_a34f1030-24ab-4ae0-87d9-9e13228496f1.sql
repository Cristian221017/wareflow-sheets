-- Remover log de teste
DELETE FROM system_logs WHERE entity_type = 'TEST' AND action = 'MANUAL_TEST';