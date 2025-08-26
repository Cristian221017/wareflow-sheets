-- Limpeza simples de usuários órfãos no sistema

-- Remover perfis de usuários que não têm vínculos com transportadoras nem clientes
DELETE FROM profiles 
WHERE user_id IN (
  SELECT p.user_id
  FROM profiles p
  LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
  WHERE ut.user_id IS NULL 
    AND uc.user_id IS NULL
);

-- Verificar resultado da limpeza
SELECT 
  'Limpeza concluída! Restaram apenas usuários com vínculos válidos.' as resultado,
  COUNT(*) as usuarios_restantes
FROM profiles;