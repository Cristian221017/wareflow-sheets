-- Primeiro, vamos buscar uma transportadora existente ou criar uma para demo
INSERT INTO transportadoras (razao_social, nome_fantasia, cnpj, email, status)
VALUES ('Transportadora Demo Admin', 'Demo Admin', '00.000.000/0001-00', 'admin@demo.com', 'ativo')
ON CONFLICT (cnpj) DO NOTHING;

-- Agora inserir o super admin associado à primeira transportadora
INSERT INTO user_transportadoras (user_id, role, is_active, transportadora_id)
VALUES (
  '1191ff46-13f7-4984-9e8d-2e857827680c', 
  'super_admin'::user_role, 
  true, 
  (SELECT id FROM transportadoras LIMIT 1)
)
ON CONFLICT (user_id, transportadora_id) DO UPDATE SET
  role = 'super_admin'::user_role,
  is_active = true;