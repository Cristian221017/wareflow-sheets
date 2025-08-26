-- Corrigir usuário crisrd1256@gmail.com que não estava vinculado à transportadora
INSERT INTO public.user_transportadoras (user_id, transportadora_id, role, is_active)
SELECT 
    p.user_id,
    (SELECT id FROM public.transportadoras LIMIT 1), -- Usar primeira transportadora
    'admin_transportadora'::user_role,
    true
FROM public.profiles p
WHERE p.email = 'crisrd1256@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_transportadoras ut 
    WHERE ut.user_id = p.user_id
  );