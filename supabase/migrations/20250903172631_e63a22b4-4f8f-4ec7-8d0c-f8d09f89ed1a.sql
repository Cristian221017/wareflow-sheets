-- Adicionar políticas RLS para o bucket 'solicitacoes-anexos' também
-- Política para transportadoras verem anexos de solicitações
CREATE POLICY "Transportadoras podem ver anexos de solicitações" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM user_transportadoras ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('admin_transportadora', 'operador', 'super_admin')
  )
);

-- Política para clientes verem anexos de suas solicitações
CREATE POLICY "Clientes podem ver anexos de suas solicitações" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM user_clientes uc 
    WHERE uc.user_id = auth.uid()
  )
);