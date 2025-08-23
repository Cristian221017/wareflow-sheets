-- Corrigir as políticas RLS do Storage para serem mais específicas e funcionais
-- Remover as políticas problemáticas e criar novas mais simples

-- Política para transportadoras fazerem upload
DROP POLICY IF EXISTS "Transportadora pode upload de documentos" ON storage.objects;
CREATE POLICY "Transportadora pode upload documentos financeiros" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'financeiro-docs' 
  AND has_role(auth.uid(), 'admin_transportadora')
);

-- Política para transportadoras visualizarem documentos
DROP POLICY IF EXISTS "Transportadora pode visualizar seus documentos" ON storage.objects;  
CREATE POLICY "Transportadora pode visualizar documentos financeiros" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'financeiro-docs' 
  AND (
    has_role(auth.uid(), 'admin_transportadora') 
    OR has_role(auth.uid(), 'operador')
  )
);