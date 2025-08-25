-- Backfill #1: Vincular usuários existentes aos seus clientes
INSERT INTO public.user_clientes (user_id, cliente_id)
SELECT p.user_id, c.id as cliente_id
FROM public.profiles p
JOIN public.clientes c ON lower(trim(c.email)) = lower(trim(p.email))
WHERE c.status = 'ativo'
ON CONFLICT (user_id, cliente_id) DO NOTHING;

-- Backfill #2: Atualizar documentos financeiros sem cliente_id usando transportadora
UPDATE public.documentos_financeiros df
SET cliente_id = c.id
FROM public.clientes c
WHERE df.cliente_id IS NULL
  AND df.transportadora_id = c.transportadora_id
  AND c.status = 'ativo'
  AND EXISTS (
    SELECT 1 FROM public.clientes c2 
    WHERE c2.transportadora_id = df.transportadora_id 
    GROUP BY c2.transportadora_id 
    HAVING COUNT(*) = 1
  );