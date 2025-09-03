-- Criar bucket documents se não existir
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket documents
CREATE POLICY "Transportadoras podem ver documentos de suas NFs"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM notas_fiscais nf
    JOIN user_transportadoras ut ON ut.transportadora_id = nf.transportadora_id
    WHERE ut.user_id = auth.uid() AND ut.is_active = true
    AND name LIKE '%' || nf.id::text || '%'
  )
);

CREATE POLICY "Transportadoras podem fazer upload de documentos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() AND ut.is_active = true
  )
);

CREATE POLICY "Clientes podem ver documentos de suas NFs"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM notas_fiscais nf
    JOIN user_clientes uc ON uc.cliente_id = nf.cliente_id
    WHERE uc.user_id = auth.uid()
    AND name LIKE '%' || nf.id::text || '%'
  )
);