-- Verificar e corrigir políticas RLS do Storage
-- Primeiro, vamos ver as políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Criar políticas RLS adequadas para o storage
-- Policy para permitir que usuários vejam objetos do bucket financeiro-docs baseado no owner
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'financeiro-docs' AND auth.uid() = owner);

-- Policy para permitir que usuários façam upload de seus próprios documentos
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'financeiro-docs' AND auth.uid() = owner);

-- Policy para permitir que usuários atualizem seus próprios documentos
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'financeiro-docs' AND auth.uid() = owner);

-- Policy para permitir que usuários deletem seus próprios documentos
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'financeiro-docs' AND auth.uid() = owner);