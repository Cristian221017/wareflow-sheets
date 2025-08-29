-- Políticas de storage para bucket solicitacoes-anexos
-- Clientes podem fazer upload de anexos para suas solicitações
CREATE POLICY "Clientes podem fazer upload de anexos para suas solicitações"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM public.user_clientes uc
    WHERE uc.user_id = auth.uid()
      AND (storage.foldername(name))[1] = uc.cliente_id::text
  )
);

-- Clientes podem visualizar seus próprios anexos
CREATE POLICY "Clientes podem visualizar seus próprios anexos"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM public.user_clientes uc
    WHERE uc.user_id = auth.uid()
      AND (storage.foldername(name))[1] = uc.cliente_id::text
  )
);

-- Transportadoras podem visualizar anexos de suas solicitações
CREATE POLICY "Transportadoras podem visualizar anexos de suas solicitações"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    public.has_role(auth.uid(), 'super_admin'::user_role)
    OR EXISTS (
      SELECT 1 
      FROM public.user_transportadoras ut
      JOIN public.clientes c ON c.transportadora_id = ut.transportadora_id
      WHERE ut.user_id = auth.uid()
        AND ut.is_active = true
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

-- Transportadoras podem deletar anexos se necessário
CREATE POLICY "Transportadoras podem deletar anexos de suas solicitações"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    public.has_role(auth.uid(), 'super_admin'::user_role)
    OR EXISTS (
      SELECT 1 
      FROM public.user_transportadoras ut
      JOIN public.clientes c ON c.transportadora_id = ut.transportadora_id
      WHERE ut.user_id = auth.uid()
        AND ut.is_active = true
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);