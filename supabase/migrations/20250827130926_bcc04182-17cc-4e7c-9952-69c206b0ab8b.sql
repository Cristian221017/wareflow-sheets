-- Corrigir constraint de volume para permitir valores maiores ou iguais a 0
-- Isso permite volume = 0 quando não especificado
ALTER TABLE public.notas_fiscais 
DROP CONSTRAINT IF EXISTS notas_fiscais_volume_check;

-- Criar nova constraint que permite volume >= 0
ALTER TABLE public.notas_fiscais 
ADD CONSTRAINT notas_fiscais_volume_check 
CHECK (volume >= 0);

-- Log da alteração
INSERT INTO system_logs (
  actor_user_id, actor_role, entity_type, action, status, message, meta
) VALUES (
  NULL, 'system', 'DATABASE', 'CONSTRAINT_UPDATED', 'INFO',
  'Constraint de volume atualizada para permitir valores >= 0',
  jsonb_build_object(
    'table', 'notas_fiscais',
    'constraint', 'notas_fiscais_volume_check',
    'old_rule', 'volume > 0',
    'new_rule', 'volume >= 0'
  )
);