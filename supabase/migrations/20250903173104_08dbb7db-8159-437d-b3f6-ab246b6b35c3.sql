-- Política para permitir transportadoras fazerem upload no bucket solicitacoes-anexos
CREATE POLICY "Transportadoras podem fazer upload no bucket solicitacoes-anexos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM user_transportadoras ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('admin_transportadora', 'operador', 'super_admin')
  )
);

-- Política para permitir transportadoras atualizarem no bucket solicitacoes-anexos
CREATE POLICY "Transportadoras podem atualizar no bucket solicitacoes-anexos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    auth.uid() = owner
    OR EXISTS (
      SELECT 1 FROM user_transportadoras ut 
      WHERE ut.user_id = auth.uid() 
      AND ut.is_active = true 
      AND ut.role IN ('admin_transportadora', 'super_admin')
    )
  )
);