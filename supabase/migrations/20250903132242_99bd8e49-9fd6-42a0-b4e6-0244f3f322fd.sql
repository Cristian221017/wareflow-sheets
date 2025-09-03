-- Criar bucket de documentos se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários da transportadora vejam e insiram documentos
CREATE POLICY "Transportadora pode gerenciar documentos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
    AND ut.role IN ('admin_transportadora', 'operador')
  )
)
WITH CHECK (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
    AND ut.role IN ('admin_transportadora', 'operador')
  )
);

-- Política para permitir que clientes vejam documentos de suas NFs
CREATE POLICY "Clientes podem ver documentos de suas NFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM user_clientes uc
    WHERE uc.user_id = auth.uid()
  )
);