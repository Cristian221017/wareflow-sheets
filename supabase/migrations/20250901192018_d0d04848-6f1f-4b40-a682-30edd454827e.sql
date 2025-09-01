-- Criar função otimizada para buscar dados do usuário sem timeouts
CREATE OR REPLACE FUNCTION public.get_user_data_optimized(p_user_id uuid, p_email text)
RETURNS TABLE(
  user_type text,
  user_data jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile_data jsonb;
  v_user_transportadora jsonb;
  v_cliente_data jsonb;
  v_user_cliente_link boolean := false;
BEGIN
  -- Buscar profile (sempre deveria existir)
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'email', p.email,
    'user_id', p.user_id
  ) INTO v_profile_data
  FROM profiles p
  WHERE p.user_id = p_user_id;
  
  -- Verificar se tem vínculo com transportadora
  SELECT jsonb_build_object(
    'role', ut.role,
    'transportadora_id', ut.transportadora_id,
    'is_active', ut.is_active
  ) INTO v_user_transportadora
  FROM user_transportadoras ut
  WHERE ut.user_id = p_user_id AND ut.is_active = true
  LIMIT 1;
  
  -- Se tem vínculo com transportadora, retornar como transportadora user
  IF v_user_transportadora IS NOT NULL THEN
    RETURN QUERY SELECT 
      'transportadora'::text,
      jsonb_build_object(
        'id', p_user_id,
        'name', COALESCE(v_profile_data->>'name', split_part(p_email, '@', 1)),
        'email', p_email,
        'type', 'transportadora',
        'role', v_user_transportadora->>'role',
        'transportadora_id', v_user_transportadora->>'transportadora_id'
      );
    RETURN;
  END IF;
  
  -- Verificar se tem vínculo com cliente
  SELECT true INTO v_user_cliente_link
  FROM user_clientes uc
  WHERE uc.user_id = p_user_id
  LIMIT 1;
  
  -- Buscar dados do cliente se tem vínculo
  IF v_user_cliente_link THEN
    SELECT jsonb_build_object(
      'cliente_id', c.id,
      'razao_social', c.razao_social,
      'cnpj', c.cnpj,
      'email_nota_fiscal', c.email_nota_fiscal,
      'email_solicitacao_liberacao', c.email_solicitacao_liberacao,
      'email_liberacao_autorizada', c.email_liberacao_autorizada,
      'transportadora_id', c.transportadora_id
    ) INTO v_cliente_data
    FROM user_clientes uc
    JOIN clientes c ON c.id = uc.cliente_id
    WHERE uc.user_id = p_user_id AND c.status = 'ativo'
    LIMIT 1;
    
    IF v_cliente_data IS NOT NULL THEN
      RETURN QUERY SELECT 
        'cliente'::text,
        jsonb_build_object(
          'id', p_user_id,
          'name', v_cliente_data->>'razao_social',
          'email', p_email,
          'type', 'cliente',
          'cnpj', v_cliente_data->>'cnpj',
          'emailNotaFiscal', v_cliente_data->>'email_nota_fiscal',
          'emailSolicitacaoLiberacao', v_cliente_data->>'email_solicitacao_liberacao',
          'emailLiberacaoAutorizada', v_cliente_data->>'email_liberacao_autorizada',
          'clienteId', v_cliente_data->>'cliente_id',
          'transportadoraId', v_cliente_data->>'transportadora_id'
        );
      RETURN;
    END IF;
  END IF;
  
  -- Fallback: criar usuário básico
  RETURN QUERY SELECT 
    'cliente'::text,
    jsonb_build_object(
      'id', p_user_id,
      'name', COALESCE(v_profile_data->>'name', split_part(p_email, '@', 1)),
      'email', p_email,
      'type', 'cliente'
    );
END;
$$;