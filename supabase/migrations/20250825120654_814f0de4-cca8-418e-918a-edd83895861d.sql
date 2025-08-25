-- Associar o usuário criado como super admin
INSERT INTO user_transportadoras (user_id, transportadora_id, role, is_active)
VALUES ('26b27800-5041-4572-80de-6e9f17a05231', '00000000-0000-4000-8000-000000000001', 'super_admin', true)
ON CONFLICT (user_id, transportadora_id) 
DO UPDATE SET 
  role = 'super_admin',
  is_active = true;