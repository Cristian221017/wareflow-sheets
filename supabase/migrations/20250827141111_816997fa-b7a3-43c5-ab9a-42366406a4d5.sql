-- CRIAR VÍNCULO MANUAL - Problema: emails não coincidem
-- Cliente: comercial@rodoveigatransportes.com.br
-- Super Admin: crisrd2608@gmail.com

-- Vamos criar um vínculo manual para resolver o problema imediato
INSERT INTO public.user_clientes (user_id, cliente_id)
SELECT 
  '26b27800-5041-4572-80de-6e9f17a05231'::uuid, -- Super Admin user_id
  'ddfd8c73-fa8b-4443-8443-28ecb82cca6c'::uuid   -- H TRANSPORTES cliente_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_clientes 
  WHERE user_id = '26b27800-5041-4572-80de-6e9f17a05231' 
  AND cliente_id = 'ddfd8c73-fa8b-4443-8443-28ecb82cca6c'
);

-- Verificar resultado
SELECT 'VÍNCULOS APÓS CORREÇÃO' as status, COUNT(*) as total 
FROM public.user_clientes;