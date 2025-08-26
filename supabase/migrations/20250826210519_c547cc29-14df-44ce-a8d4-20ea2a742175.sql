-- Limpeza de dados órfãos no sistema
-- Remove usuários que não têm vínculos válidos com transportadoras ou clientes

-- Identificar e remover perfis órfãos (que não têm vínculos com transportadoras nem clientes)
WITH usuarios_orfaos AS (
  SELECT p.user_id, p.email
  FROM profiles p
  LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
  WHERE ut.user_id IS NULL 
    AND uc.user_id IS NULL
)
DELETE FROM profiles 
WHERE user_id IN (SELECT user_id FROM usuarios_orfaos);

-- Log da limpeza para auditoria
INSERT INTO event_log (
  entity_type, action, message, payload, actor_id, created_at
) VALUES (
  'SYSTEM', 
  'CLEANUP_ORPHANED_USERS', 
  'Limpeza automática de usuários órfãos sem vínculos válidos',
  jsonb_build_object(
    'cleanup_type', 'orphaned_profiles',
    'reason', 'usuarios_sem_vinculos_transportadora_ou_cliente'
  ),
  (SELECT user_id FROM user_transportadoras WHERE role = 'super_admin' LIMIT 1),
  now()
);

-- Comentário informativo
SELECT 'Limpeza concluída: removidos usuários órfãos que não possuem vínculos com transportadoras ou clientes' as resultado;