-- Check and create storage policies for client document access

-- Allow clients to download documents from the financeiro-docs bucket
-- based on the same client email logic used in the documentos_financeiros table RLS
CREATE POLICY "Clientes podem baixar seus documentos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'financeiro-docs' 
  AND EXISTS (
    SELECT 1 
    FROM public.documentos_financeiros df
    JOIN public.clientes c ON c.id = df.cliente_id
    JOIN public.profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
    AND (
      storage.filename(name) LIKE CONCAT(df.numero_cte, '%')
      OR name LIKE CONCAT('%/', df.numero_cte, '%')
    )
  )
);

-- Ensure transportadora staff can still access their documents
CREATE POLICY "Transportadoras podem baixar documentos de seus clientes"
ON storage.objects
FOR SELECT  
USING (
  bucket_id = 'financeiro-docs'
  AND EXISTS (
    SELECT 1
    FROM public.documentos_financeiros df
    WHERE df.transportadora_id = public.get_user_transportadora(auth.uid())
    AND (
      storage.filename(name) LIKE CONCAT(df.numero_cte, '%')
      OR name LIKE CONCAT('%/', df.numero_cte, '%')
    )
  )
);