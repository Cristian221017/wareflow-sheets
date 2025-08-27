-- Criar vínculo para o cliente que existe mas não tem profile correspondente
-- Vamos criar um profile temporário e depois o vínculo
INSERT INTO public.profiles (user_id, name, email)
SELECT 
  '26b27800-5041-4572-80de-6e9f17a05231'::uuid,
  'Cliente H Transportes',
  'comercial@rodoveigatransportes.com.br'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE email = 'comercial@rodoveigatransportes.com.br'
);

-- Garantir que o vínculo existe
INSERT INTO public.user_clientes (user_id, cliente_id)
SELECT 
  '26b27800-5041-4572-80de-6e9f17a05231'::uuid,
  'ddfd8c73-fa8b-4443-8443-28ecb82cca6c'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_clientes 
  WHERE user_id = '26b27800-5041-4572-80de-6e9f17a05231'::uuid
  AND cliente_id = 'ddfd8c73-fa8b-4443-8443-28ecb82cca6c'::uuid
);