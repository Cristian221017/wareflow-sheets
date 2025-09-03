-- Políticas para o bucket solicitacoes-anexos
DROP POLICY IF EXISTS "Transportadoras podem ver anexos de suas solicitações" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem ver anexos de suas solicitações" ON storage.objects;

CREATE POLICY "Transportadoras podem ver anexos de suas solicitações" 
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

CREATE POLICY "Clientes podem ver anexos de suas solicitações" 
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