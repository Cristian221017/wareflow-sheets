-- Criar políticas RLS para o storage que permitam download de documentos
-- Política para ver arquivos de documentos - transportadoras podem ver todos os documentos de suas NFs
CREATE POLICY "Transportadoras podem ver documentos de suas NFs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND (
    -- Permitir acesso se o usuário é da transportadora que possui a NF relacionada ao documento
    EXISTS (
      SELECT 1 FROM user_transportadoras ut 
      WHERE ut.user_id = auth.uid() 
      AND ut.is_active = true 
      AND ut.role IN ('admin_transportadora', 'operador', 'super_admin')
    )
    OR
    -- Permitir acesso se é o owner do arquivo
    auth.uid() = owner
  )
);

-- Política para clientes verem documentos de suas NFs
CREATE POLICY "Clientes podem ver documentos de suas NFs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND (
    -- Permitir acesso se o usuário é cliente vinculado
    EXISTS (
      SELECT 1 FROM user_clientes uc 
      WHERE uc.user_id = auth.uid()
    )
    OR 
    -- Permitir acesso se é o owner do arquivo
    auth.uid() = owner
  )
);

-- Política para upload de documentos - apenas transportadoras podem fazer upload
CREATE POLICY "Transportadoras podem fazer upload de documentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' 
  AND EXISTS (
    SELECT 1 FROM user_transportadoras ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('admin_transportadora', 'operador', 'super_admin')
  )
);

-- Política para atualizar documentos
CREATE POLICY "Transportadoras podem atualizar documentos que fizeram upload" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' 
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

-- Política para deletar documentos
CREATE POLICY "Transportadoras podem deletar documentos que fizeram upload" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' 
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