-- Função para validar integridade de dados
CREATE OR REPLACE FUNCTION public.validate_data_integrity()
RETURNS TABLE(
  validation_id UUID,
  status TEXT,
  issues_found INTEGER,
  details JSONB
) LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_validation_id UUID;
  v_issues INTEGER := 0;
  v_details JSONB := '{}';
  v_orphaned_count INTEGER;
  v_invalid_status_count INTEGER;
BEGIN
  -- Create validation record
  INSERT INTO public.deployment_validations (validation_type, status)
  VALUES ('data_integrity', 'running')
  RETURNING id INTO v_validation_id;
  
  -- Check for orphaned records in notas_fiscais
  SELECT COUNT(*) INTO v_orphaned_count 
  FROM public.notas_fiscais nf
  LEFT JOIN public.clientes c ON c.id = nf.cliente_id
  WHERE c.id IS NULL;
  
  v_details := jsonb_set(v_details, '{orphaned_nfs}', to_jsonb(v_orphaned_count));
  
  -- Check for inconsistent statuses
  SELECT COUNT(*) INTO v_invalid_status_count 
  FROM public.notas_fiscais
  WHERE status NOT IN ('ARMAZENADA', 'SOLICITADA', 'CONFIRMADA', 'CARREGADA');
  
  v_details := jsonb_set(v_details, '{invalid_statuses}', to_jsonb(v_invalid_status_count));
  
  v_issues := v_orphaned_count + v_invalid_status_count;
  
  -- Update validation record
  UPDATE public.deployment_validations
  SET status = CASE WHEN v_issues = 0 THEN 'passed' ELSE 'failed' END,
      result = v_details,
      completed_at = now()
  WHERE id = v_validation_id;
  
  RETURN QUERY SELECT v_validation_id, 
                     CASE WHEN v_issues = 0 THEN 'passed' ELSE 'failed' END,
                     v_issues,
                     v_details;
END;
$$;

-- Função para criar backup de segurança
CREATE OR REPLACE FUNCTION public.create_safety_backup(p_backup_name TEXT)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_backup_id UUID;
  v_tables TEXT[] := ARRAY['notas_fiscais', 'clientes', 'documentos_financeiros', 'transportadoras'];
BEGIN
  -- Apenas super admins podem criar backups
  IF NOT EXISTS (
    SELECT 1 FROM public.user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.role = 'super_admin'
    AND ut.is_active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas super admins podem criar backups';
  END IF;
  
  INSERT INTO public.system_backups (name, description, tables_backed_up, created_by)
  VALUES (p_backup_name, 'Backup de segurança antes de deployment', v_tables, auth.uid())
  RETURNING id INTO v_backup_id;
  
  -- Simular processo de backup (em produção, integraria com sistema real)
  UPDATE public.system_backups
  SET status = 'completed', completed_at = now()
  WHERE id = v_backup_id;
  
  RETURN v_backup_id;
END;
$$;

-- Função para health check do sistema
CREATE OR REPLACE FUNCTION public.run_system_health_check()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_user_count INTEGER;
  v_nf_count INTEGER;
  v_error_count INTEGER;
  v_status TEXT;
  v_message TEXT;
BEGIN
  -- Check database connectivity and basic metrics
  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  SELECT COUNT(*) INTO v_nf_count FROM public.notas_fiscais;
  
  -- Check for recent errors in system_logs
  SELECT COUNT(*) INTO v_error_count 
  FROM public.system_logs 
  WHERE status = 'ERROR' AND created_at > now() - interval '1 hour';
  
  -- Determine system status
  IF v_error_count > 10 THEN
    v_status := 'critical';
    v_message := 'Alto número de erros detectados';
  ELSIF v_error_count > 5 THEN
    v_status := 'warning';
    v_message := 'Erros moderados detectados';
  ELSE
    v_status := 'healthy';
    v_message := 'Sistema funcionando normalmente';
  END IF;
  
  -- Insert health check results
  INSERT INTO public.system_health_checks (check_type, status, metrics, message)
  VALUES (
    'database',
    v_status,
    jsonb_build_object(
      'total_users', v_user_count,
      'total_nfs', v_nf_count,
      'recent_errors', v_error_count,
      'timestamp', now()
    ),
    v_message
  );
END;
$$;

-- Função para obter configuração de deployment
CREATE OR REPLACE FUNCTION public.get_deployment_config(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value
  FROM public.deployment_config
  WHERE key = p_key;
  
  RETURN COALESCE(v_value, 'null'::jsonb);
END;
$$;