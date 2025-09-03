-- Criar bucket para anexos de solicitações se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('solicitacoes-anexos', 'solicitacoes-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas RLS para o bucket solicitacoes-anexos
-- Política para visualizar documentos (clientes e transportadoras)
CREATE POLICY "Users can view solicitacao docs from their context" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND (
    -- Transportadoras podem ver documentos de suas NFs
    (EXISTS (
      SELECT 1 FROM user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.is_active = true 
      AND ut.transportadora_id::text = (storage.foldername(name))[1]
    ))
    OR
    -- Clientes podem ver documentos de suas NFs
    (EXISTS (
      SELECT 1 FROM notas_fiscais nf
      JOIN user_clientes uc ON uc.cliente_id = nf.cliente_id
      WHERE uc.user_id = auth.uid()
      AND nf.id::text = (storage.foldername(name))[2]
    ))
  )
);

-- Política para upload de documentos (apenas transportadoras)
CREATE POLICY "Transportadoras can upload solicitacao docs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id::text = (storage.foldername(name))[1]
  )
);

-- Política para atualizar documentos (apenas transportadoras)
CREATE POLICY "Transportadoras can update solicitacao docs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'solicitacoes-anexos' 
  AND EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.transportadora_id::text = (storage.foldername(name))[1]
  )
);

-- Criar função RPC para atualizar status de separação
CREATE OR REPLACE FUNCTION public.nf_update_status_separacao(
  p_nf_id uuid, 
  p_novo_status separacao_status,
  p_observacoes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_transportadora_id UUID;
  v_nf_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar informações da NF
  SELECT numero_nf, cliente_id, transportadora_id, status_separacao 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Obter transportadora e role do usuário
  SELECT ut.transportadora_id, ut.role 
  INTO v_transportadora_id, v_user_role
  FROM user_transportadoras ut
  WHERE ut.user_id = v_user_id AND ut.is_active = true
  LIMIT 1;
  
  IF v_transportadora_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem transportadora associada';
  END IF;
  
  -- Verificar se a NF pertence à transportadora do usuário
  IF v_nf_info.transportadora_id != v_transportadora_id THEN
    RAISE EXCEPTION 'Usuário não tem permissão para alterar esta NF';
  END IF;
  
  -- Atualizar status de separação
  UPDATE public.notas_fiscais
  SET 
    status_separacao = p_novo_status,
    updated_at = now()
  WHERE id = p_nf_id;
  
  -- Log do evento
  PERFORM log_system_event(
    'NF', 'STATUS_SEPARACAO_UPDATED', 'INFO',
    'Status de separação atualizado',
    p_nf_id, v_transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_anterior', v_nf_info.status_separacao,
      'status_novo', p_novo_status,
      'observacoes', p_observacoes
    )
  );
END;
$$;