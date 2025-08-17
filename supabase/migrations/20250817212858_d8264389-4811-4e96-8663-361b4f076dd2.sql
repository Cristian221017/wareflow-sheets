-- Inserir dados de teste para desenvolvimento

-- Inserir uma transportadora de exemplo
INSERT INTO public.transportadoras (
  razao_social,
  nome_fantasia,
  cnpj,
  email,
  telefone,
  cidade,
  estado,
  status,
  plano,
  limite_usuarios,
  limite_clientes
) VALUES (
  'Transportadora ABC Ltda',
  'ABC Logística',
  '12.345.678/0001-90',
  'contato@abclogistica.com',
  '(11) 99999-9999',
  'São Paulo',
  'SP',
  'ativo',
  'premium',
  10,
  100
) ON CONFLICT (cnpj) DO NOTHING;

-- Inserir um cliente de exemplo
DO $$
DECLARE
  transportadora_id UUID;
BEGIN
  -- Buscar o ID da transportadora
  SELECT id INTO transportadora_id 
  FROM public.transportadoras 
  WHERE cnpj = '12.345.678/0001-90'
  LIMIT 1;
  
  -- Inserir cliente se a transportadora existir
  IF transportadora_id IS NOT NULL THEN
    INSERT INTO public.clientes (
      transportadora_id,
      razao_social,
      nome_fantasia,
      cnpj,
      email,
      telefone,
      cidade,
      estado,
      email_nota_fiscal,
      email_solicitacao_liberacao,
      email_liberacao_autorizada,
      status
    ) VALUES (
      transportadora_id,
      'Cliente Premium Ltda',
      'Premium Corp',
      '11.222.333/0001-44',
      'contato@premiumcorp.com',
      '(11) 88888-8888',
      'São Paulo',
      'SP',
      'nf@premiumcorp.com',
      'solicitacao@premiumcorp.com',
      'liberacao@premiumcorp.com',
      'ativo'
    ) ON CONFLICT (transportadora_id, cnpj) DO NOTHING;
  END IF;
END $$;