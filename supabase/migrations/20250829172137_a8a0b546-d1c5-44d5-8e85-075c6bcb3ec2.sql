-- Corrigir RLS para permitir que clientes vejam seus próprios dados
-- Verificar se existe política para clientes acessarem seus dados via email
DO $$ 
BEGIN
    -- Verificar se a política já existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clientes' 
        AND policyname = 'Clientes podem ver seus dados via email'
    ) THEN
        -- Criar política para clientes acessarem seus próprios dados pelo email
        CREATE POLICY "Clientes podem ver seus dados via email"
        ON public.clientes 
        FOR SELECT 
        USING (
            -- Permitir acesso se o email do usuário autenticado coincide com o email do cliente
            EXISTS (
                SELECT 1 
                FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.email = clientes.email
                AND clientes.status = 'ativo'
            )
        );
    END IF;
END $$;

-- Garantir que existe política para super_admin e admin_transportadora verem clientes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clientes' 
        AND policyname = 'Transportadoras podem ver seus clientes'
    ) THEN
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
    END IF;
END $$;