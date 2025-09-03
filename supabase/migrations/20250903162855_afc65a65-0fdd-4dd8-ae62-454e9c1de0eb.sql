-- Adicionar política UPDATE específica para notas_fiscais
CREATE POLICY "Transportadoras podem atualizar suas NFs" 
ON public.notas_fiscais 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  EXISTS (
    SELECT 1 
    FROM user_transportadoras ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = notas_fiscais.transportadora_id 
    AND ut.role IN ('admin_transportadora', 'operador')
  )
) 
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  EXISTS (
    SELECT 1 
    FROM user_transportadoras ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id = notas_fiscais.transportadora_id 
    AND ut.role IN ('admin_transportadora', 'operador')
  )
);