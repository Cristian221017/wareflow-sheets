-- Inserir associação do usuário admin com a transportadora
INSERT INTO user_transportadoras (user_id, transportadora_id, role, is_active)
VALUES (
  'c2f249c1-bdfc-4080-8d99-4f631e96414d',
  '00000000-0000-4000-8000-000000000001',
  'admin_transportadora',
  true
)
ON CONFLICT (user_id, transportadora_id) DO UPDATE SET
  role = 'admin_transportadora',
  is_active = true;