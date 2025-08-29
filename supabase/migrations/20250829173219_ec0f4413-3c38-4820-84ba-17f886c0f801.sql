-- Corrigir RLS para clientes usando auth.email() em vez de auth.users join
-- Remove policies existentes e recria com abordagem correta

DROP POLICY IF EXISTS "Clientes podem ver seus dados via email" ON public.clientes;
DROP POLICY IF EXISTS "Transportadoras podem ver seus clientes" ON public.clientes;

-- Criar política que funciona com auth.email() 
CREATE POLICY "Clientes podem ver seus dados via email"
ON public.clientes 
FOR SELECT 
USING (
    -- Usar auth.email() que é mais confiável
    clientes.email = auth.email()
    AND clientes.status = 'ativo'
);

-- Política para transportadoras
CREATE POLICY "Transportadoras podem ver seus clientes"
ON public.clientes 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_transportadoras ut
        WHERE ut.user_id = auth.uid()
          AND ut.is_active = true
          AND (
            ut.role = 'super_admin' 
            OR (ut.role = 'admin_transportadora' AND ut.transportadora_id = clientes.transportadora_id)
          )
    )
);