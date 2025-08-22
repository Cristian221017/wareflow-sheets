-- Seeds de exemplo para NFs de desenvolvimento
-- Limpar dados existentes de teste e criar novos
DELETE FROM notas_fiscais WHERE numero_nf LIKE 'DEV-%';
DELETE FROM clientes WHERE cnpj = '98.765.432/0001-10';  
DELETE FROM transportadoras WHERE cnpj = '12.345.678/0001-90';

-- Inserir transportadora de exemplo
INSERT INTO transportadoras (id, nome_fantasia, razao_social, cnpj, email, telefone)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Transportadora Demo',
  'Transportadora Demo LTDA',  
  '12.345.678/0001-90',
  'admin@transportadora.com',
  '(11) 99999-9999'
);

-- Inserir cliente de exemplo   
INSERT INTO clientes (id, nome_fantasia, razao_social, cnpj, email, telefone, transportadora_id)
VALUES (
  '00000000-0000-4000-8000-000000000002', 
  'Cliente Demo',
  'Cliente Demo LTDA',
  '98.765.432/0001-10',
  'cliente@empresa.com',
  '(11) 88888-8888',
  '00000000-0000-4000-8000-000000000001'
);

-- Inserir 10 NFs de exemplo distribuídas nos 3 status
INSERT INTO notas_fiscais (
  numero_nf, numero_pedido, ordem_compra, cliente_id, transportadora_id,
  fornecedor, produto, quantidade, peso, volume, localizacao, 
  data_recebimento, status, cnpj_fornecedor
) VALUES 
-- ARMAZENADAS (4 NFs)
('DEV-001', 'PED-001', 'OC-001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Alpha', 'Equipamentos Eletrônicos', 50, 250.5, 2.5, 'A1-B2-C3', '2024-01-15', 'ARMAZENADA', '11.222.333/0001-44'),

('DEV-002', 'PED-002', 'OC-002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 
 'Fornecedor Beta', 'Materiais de Construção', 100, 1500.0, 15.0, 'B2-C3-D4', '2024-01-16', 'ARMAZENADA', '22.333.444/0001-55'),

('DEV-003', 'PED-003', 'OC-003', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Gamma', 'Produtos Químicos', 25, 500.0, 3.0, 'C3-D4-E5', '2024-01-17', 'ARMAZENADA', '33.444.555/0001-66'),

('DEV-004', 'PED-004', 'OC-004', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Delta', 'Peças Automotivas', 75, 800.0, 8.5, 'D4-E5-F6', '2024-01-18', 'ARMAZENADA', '44.555.666/0001-77'),

-- SOLICITADAS (3 NFs)
('DEV-005', 'PED-005', 'OC-005', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Epsilon', 'Componentes Industriais', 40, 600.0, 5.0, 'E5-F6-G7', '2024-01-19', 'SOLICITADA', '55.666.777/0001-88'),

('DEV-006', 'PED-006', 'OC-006', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Zeta', 'Equipamentos Médicos', 20, 300.0, 2.0, 'F6-G7-H8', '2024-01-20', 'SOLICITADA', '66.777.888/0001-99'),

('DEV-007', 'PED-007', 'OC-007', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Eta', 'Produtos Farmacêuticos', 15, 150.0, 1.2, 'G7-H8-I9', '2024-01-21', 'SOLICITADA', '77.888.999/0001-00'),

-- CONFIRMADAS (3 NFs)  
('DEV-008', 'PED-008', 'OC-008', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Theta', 'Materiais Têxteis', 200, 400.0, 20.0, 'H8-I9-J0', '2024-01-22', 'CONFIRMADA', '88.999.000/0001-11'),

('DEV-009', 'PED-009', 'OC-009', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Iota', 'Produtos Alimentícios', 300, 900.0, 12.0, 'I9-J0-K1', '2024-01-23', 'CONFIRMADA', '99.000.111/0001-22'),

('DEV-010', 'PED-010', 'OC-010', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
 'Fornecedor Kappa', 'Equipamentos de Segurança', 60, 350.0, 4.5, 'J0-K1-L2', '2024-01-24', 'CONFIRMADA', '00.111.222/0001-33');