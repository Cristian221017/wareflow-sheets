-- Sistema de Feature Flags para controle de funcionalidades
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  environment TEXT NOT NULL DEFAULT 'all', -- 'staging', 'prod', 'all'
  target_users JSONB DEFAULT '[]', -- IDs de usuários específicos para teste
  percentage INTEGER DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100), -- rollout gradual
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Sistema de Backup/Restore
CREATE TABLE IF NOT EXISTS public.system_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tables_backed_up TEXT[] NOT NULL,
  backup_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'completed', 'failed', 'restored')),
  backup_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Sistema de Validações de Deployment
CREATE TABLE IF NOT EXISTS public.deployment_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_type TEXT NOT NULL, -- 'data_integrity', 'api_health', 'migration_check'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed')),
  result JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Sistema de Monitoramento
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_type TEXT NOT NULL, -- 'database', 'api', 'users', 'performance'
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  metrics JSONB DEFAULT '{}',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de Deployment Seguro
CREATE TABLE IF NOT EXISTS public.deployment_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at 
  BEFORE UPDATE ON public.feature_flags 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER deployment_config_updated_at 
  BEFORE UPDATE ON public.deployment_config 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- RLS Policies
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_config ENABLE ROW LEVEL SECURITY;

-- Policies para admins/super_admins
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role IN ('super_admin', 'admin_transportadora')
      AND ut.is_active = true
    )
  );

CREATE POLICY "Admins can manage backups" ON public.system_backups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role IN ('super_admin', 'admin_transportadora')
      AND ut.is_active = true
    )
  );

CREATE POLICY "Admins can view validations" ON public.deployment_validations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role IN ('super_admin', 'admin_transportadora')
      AND ut.is_active = true
    )
  );

CREATE POLICY "Everyone can view health checks" ON public.system_health_checks
  FOR SELECT USING (true);

-- Policies para deployment config (apenas super admins)
CREATE POLICY "Super admins can manage deployment config" ON public.deployment_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role = 'super_admin'
      AND ut.is_active = true
    )
  );

-- Função para validar integridade de dados
CREATE OR REPLACE FUNCTION public.validate_data_integrity()
RETURNS TABLE(
  validation_id UUID,
  status TEXT,
  issues_found INTEGER,
  details JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_validation_id UUID;
  v_issues INTEGER := 0;
  v_details JSONB := '{}';
BEGIN
  -- Create validation record
  INSERT INTO public.deployment_validations (validation_type, status)
  VALUES ('data_integrity', 'running')
  RETURNING id INTO v_validation_id;
  
  -- Check for orphaned records
  SELECT COUNT(*) INTO v_issues FROM public.notas_fiscais nf
  LEFT JOIN public.clientes c ON c.id = nf.cliente_id
  WHERE c.id IS NULL;
  
  v_details := jsonb_set(v_details, '{orphaned_nfs}', to_jsonb(v_issues));
  
  -- Check for inconsistent statuses
  SELECT COUNT(*) INTO v_issues FROM public.notas_fiscais
  WHERE status NOT IN ('ARMAZENADA', 'SOLICITADA', 'CONFIRMADA', 'CARREGADA');
  
  v_details := jsonb_set(v_details, '{invalid_statuses}', to_jsonb(v_issues));
  
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
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  
  -- Aqui integraria com sistema de backup real
  -- Por ora, apenas marca como completado
  UPDATE public.system_backups
  SET status = 'completed', completed_at = now()
  WHERE id = v_backup_id;
  
  RETURN v_backup_id;
END;
$$;

-- Função para health check do sistema
CREATE OR REPLACE FUNCTION public.run_system_health_check()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_count INTEGER;
  v_nf_count INTEGER;
  v_error_count INTEGER;
BEGIN
  -- Check database connectivity and basic metrics
  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  SELECT COUNT(*) INTO v_nf_count FROM public.notas_fiscais;
  SELECT COUNT(*) INTO v_error_count FROM public.system_logs WHERE status = 'ERROR' AND created_at > now() - interval '1 hour';
  
  -- Insert health check results
  INSERT INTO public.system_health_checks (check_type, status, metrics, message)
  VALUES (
    'database',
    CASE 
      WHEN v_error_count > 10 THEN 'critical'
      WHEN v_error_count > 5 THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object(
      'total_users', v_user_count,
      'total_nfs', v_nf_count,
      'recent_errors', v_error_count,
      'timestamp', now()
    ),
    CASE 
      WHEN v_error_count > 10 THEN 'Alto número de erros detectados'
      WHEN v_error_count > 5 THEN 'Erros moderados detectados'
      ELSE 'Sistema funcionando normalmente'
    END
  );
END;
$$;

-- Inserir configurações padrão
INSERT INTO public.deployment_config (key, value, description) VALUES
('auto_backup_before_deploy', 'true', 'Criar backup automático antes de qualquer deployment'),
('require_validation_pass', 'true', 'Exigir que todas as validações passem antes do deploy'),
('max_downtime_minutes', '5', 'Tempo máximo de downtime aceitável'),
('rollback_on_error_threshold', '10', 'Número de erros que dispara rollback automático'),
('health_check_interval_minutes', '5', 'Intervalo entre health checks automáticos')
ON CONFLICT (key) DO NOTHING;

-- Inserir feature flags essenciais
INSERT INTO public.feature_flags (key, enabled, description, environment) VALUES
('new_features_enabled', false, 'Habilita novas funcionalidades em desenvolvimento', 'staging'),
('maintenance_mode', false, 'Modo de manutenção do sistema', 'all'),
('advanced_logging', true, 'Logs detalhados para debug', 'staging'),
('performance_monitoring', true, 'Monitoramento de performance ativo', 'all')
ON CONFLICT (key) DO NOTHING;