-- Drop and recreate validate_data_integrity function
DROP FUNCTION IF EXISTS public.validate_data_integrity();

CREATE OR REPLACE FUNCTION public.validate_data_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}';
  orphaned_profiles integer := 0;
  missing_links integer := 0;
  data_stats jsonb;
BEGIN
  -- Check for orphaned profiles (users without transportadora or cliente links)
  SELECT COUNT(*) INTO orphaned_profiles
  FROM profiles p
  LEFT JOIN user_transportadoras ut ON p.user_id = ut.user_id AND ut.is_active = true
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id
  WHERE ut.user_id IS NULL AND uc.user_id IS NULL;
  
  -- Check for missing client links
  SELECT COUNT(*) INTO missing_links
  FROM profiles p
  JOIN clientes c ON email_matches(p.email, c.email)
  LEFT JOIN user_clientes uc ON p.user_id = uc.user_id AND uc.cliente_id = c.id
  WHERE uc.user_id IS NULL AND c.status = 'ativo';
  
  -- Get basic data statistics
  SELECT jsonb_build_object(
    'total_profiles', (SELECT COUNT(*) FROM profiles),
    'total_transportadoras', (SELECT COUNT(*) FROM transportadoras WHERE status = 'ativo'),
    'total_clientes', (SELECT COUNT(*) FROM clientes WHERE status = 'ativo'),
    'total_notas_fiscais', (SELECT COUNT(*) FROM notas_fiscais),
    'total_documentos_financeiros', (SELECT COUNT(*) FROM documentos_financeiros)
  ) INTO data_stats;
  
  -- Build result
  result := jsonb_build_object(
    'status', 'ok',
    'timestamp', now(),
    'issues', jsonb_build_object(
      'orphaned_profiles', orphaned_profiles,
      'missing_client_links', missing_links
    ),
    'data_stats', data_stats,
    'recommendations', CASE 
      WHEN orphaned_profiles > 0 THEN 
        jsonb_build_array('Consider running cleanup_orphaned_users() to remove orphaned profiles')
      ELSE 
        jsonb_build_array()
    END
  );
  
  RETURN result;
END;
$$;