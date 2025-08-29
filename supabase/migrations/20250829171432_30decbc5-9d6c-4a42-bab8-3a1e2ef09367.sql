-- Corrigir políticas de storage que estão causando problemas
-- Primeiro, remover políticas que podem estar causando conflito
DROP POLICY IF EXISTS "Transportadoras podem visualizar anexos de suas solicitações" ON storage.objects;
DROP POLICY IF EXISTS "Transportadoras podem deletar anexos de suas solicitações" ON storage.objects;

-- Recriar as políticas sem usar enum user_role diretamente nas políticas de storage
CREATE POLICY "Transportadoras podem visualizar anexos de suas solicitações"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid()
        AND ut.role = 'super_admin'
        AND ut.is_active = true
    )
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

CREATE POLICY "Transportadoras podem deletar anexos de suas solicitações"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid()
        AND ut.role = 'super_admin'
        AND ut.is_active = true
    )
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