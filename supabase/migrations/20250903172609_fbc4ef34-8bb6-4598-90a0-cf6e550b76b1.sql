-- Políticas para o bucket solicitacoes-anexos (caso não existam)
CREATE POLICY IF NOT EXISTS "Transportadoras podem ver anexos de suas solicitações" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    EXISTS (
      SELECT 1 FROM user_transportadoras ut 
      WHERE ut.user_id = auth.uid() 
      AND ut.is_active = true 
      AND ut.role IN ('admin_transportadora', 'operador', 'super_admin')
    )
    OR auth.uid() = owner
  )
);

CREATE POLICY IF NOT EXISTS "Clientes podem ver anexos de suas solicitações" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    EXISTS (
      SELECT 1 FROM user_clientes uc 
      WHERE uc.user_id = auth.uid()
    )
    OR auth.uid() = owner
  )
);