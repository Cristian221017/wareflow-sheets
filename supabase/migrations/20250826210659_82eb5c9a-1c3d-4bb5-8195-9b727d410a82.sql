-- Limpeza simples de usuários órfãos
-- Remove usuários que não têm vínculos válidos

-- Identificar usuários órfãos antes de remover (para log)
DO $$
DECLARE 
  usuarios_removidos TEXT;
BEGIN
  SELECT string_agg(p.email, ', ') INTO usuarios_removidos
  FROM profiles p
  LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
  WHERE ut.user_id IS NULL AND uc.user_id IS NULL;
  
  RAISE NOTICE 'Removendo usuários órfãos: %', usuarios_removidos;
END $$;

-- Remover perfis órfãos
DELETE FROM profiles 
WHERE user_id IN (
  SELECT p.user_id
  FROM profiles p
  LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
  WHERE ut.user_id IS NULL AND uc.user_id IS NULL
);

-- Verificar resultado
SELECT 
  COUNT(*) as usuarios_restantes,
  string_agg(email, ', ') as emails_validos
FROM profiles p
JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true;