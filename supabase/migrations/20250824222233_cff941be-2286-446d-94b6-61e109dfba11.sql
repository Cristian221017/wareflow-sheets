-- Inserir registro do super admin na tabela user_transportadoras
INSERT INTO user_transportadoras (user_id, role, is_active, transportadora_id)
VALUES (
  '1191ff46-13f7-4984-9e8d-2e857827680c', 
  'super_admin'::user_role, 
  true, 
  null
)
ON CONFLICT (user_id, transportadora_id) DO UPDATE SET
  role = 'super_admin'::user_role,
  is_active = true;