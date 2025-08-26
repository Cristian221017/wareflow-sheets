-- Criar tipo enum para os status de separação
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'separacao_status') THEN
        CREATE TYPE separacao_status AS ENUM ('pendente', 'em_separacao', 'separacao_concluida', 'separacao_com_pendencia');
    END IF;
END$$;

-- Adicionar coluna status_separacao na tabela notas_fiscais
ALTER TABLE public.notas_fiscais 
ADD COLUMN status_separacao separacao_status DEFAULT 'pendente'::separacao_status;

-- Função para atualizar status de separação com logs
CREATE OR REPLACE FUNCTION public.nf_update_status_separacao(
  p_nf_id UUID,
  p_status_separacao separacao_status,
  p_observacoes TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_nf_info RECORD;
BEGIN
  -- Obter user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    PERFORM log_system_event(
      'NF', 'STATUS_SEPARACAO_AUTH_ERROR', 'ERROR',
      'Tentativa de atualizar status separação sem autenticação',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id, 'novo_status', p_status_separacao)
    );
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar informações da NF
  SELECT status, numero_nf, cliente_id, transportadora_id, status_separacao 
  INTO v_nf_info
  FROM notas_fiscais 
  WHERE id = p_nf_id;
  
  IF NOT FOUND THEN
    PERFORM log_system_event(
      'NF', 'STATUS_SEPARACAO_NF_NOT_FOUND', 'ERROR',
      'NF não encontrada para atualização de status separação',
      p_nf_id, NULL, NULL,
      jsonb_build_object('nf_id', p_nf_id)
    );
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;
  
  -- Verificar se NF está ARMAZENADA (só pode alterar status separação neste estado)
  IF v_nf_info.status != 'ARMAZENADA' THEN
    PERFORM log_system_event(
      'NF', 'STATUS_SEPARACAO_INVALID_STATE', 'WARN',
      'Tentativa de alterar status separação em NF não armazenada',
      p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
      jsonb_build_object(
        'nf_numero', v_nf_info.numero_nf,
        'status_atual', v_nf_info.status,
        'status_separacao_tentativa', p_status_separacao
      )
    );
    RAISE EXCEPTION 'Status de separação só pode ser alterado quando NF está ARMAZENADA';
  END IF;
  
  -- Determinar role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'operador';
  END IF;
  
  -- Atualizar status de separação
  UPDATE public.notas_fiscais
  SET status_separacao = p_status_separacao,
      updated_at = now()
  WHERE id = p_nf_id;
  
  -- Log do sucesso
  PERFORM log_system_event(
    'NF', 'STATUS_SEPARACAO_UPDATED', 'INFO',
    'Status de separação atualizado com sucesso',
    p_nf_id, v_nf_info.transportadora_id, v_nf_info.cliente_id,
    jsonb_build_object(
      'nf_numero', v_nf_info.numero_nf,
      'status_separacao_anterior', v_nf_info.status_separacao,
      'status_separacao_novo', p_status_separacao,
      'observacoes', p_observacoes
    )
  );
END;
$$;

-- Trigger para validar status_separacao
CREATE OR REPLACE FUNCTION public.validate_status_separacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se status não é ARMAZENADA, resetar status_separacao para pendente
  IF NEW.status != 'ARMAZENADA' THEN
    NEW.status_separacao := 'pendente';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS validate_status_separacao_trigger ON public.notas_fiscais;
CREATE TRIGGER validate_status_separacao_trigger
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_separacao();

-- Comentários para documentação
COMMENT ON COLUMN public.notas_fiscais.status_separacao IS 'Status da separação da mercadoria: pendente, em_separacao, separacao_concluida, separacao_com_pendencia. Só pode ser alterado quando NF está ARMAZENADA';
COMMENT ON FUNCTION public.nf_update_status_separacao IS 'Atualiza o status de separação de uma nota fiscal (apenas quando status=ARMAZENADA)';

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status_separacao 
ON public.notas_fiscais(status_separacao) 
WHERE status = 'ARMAZENADA';