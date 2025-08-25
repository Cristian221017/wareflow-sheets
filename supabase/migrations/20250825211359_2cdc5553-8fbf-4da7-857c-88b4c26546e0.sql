-- Drop e recriar feature_flags se já existir
DROP TABLE IF EXISTS public.feature_flags CASCADE;

-- Sistema de Feature Flags para controle de funcionalidades
CREATE TABLE public.feature_flags (
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

-- RLS Policies
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_config ENABLE ROW LEVEL SECURITY;

-- Policies para feature flags (todos podem ler, apenas admins podem modificar)
CREATE POLICY "Everyone can view feature flags" ON public.feature_flags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role IN ('super_admin', 'admin_transportadora')
      AND ut.is_active = true
    )
  );

-- Policies para backups (apenas admins)
CREATE POLICY "Admins can manage backups" ON public.system_backups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role IN ('super_admin', 'admin_transportadora')
      AND ut.is_active = true
    )
  );

-- Policies para validações (todos podem ler)
CREATE POLICY "Everyone can view validations" ON public.deployment_validations
  FOR SELECT USING (true);

-- Policies para health checks (todos podem ler)
CREATE POLICY "Everyone can view health checks" ON public.system_health_checks
  FOR SELECT USING (true);

-- Policies para config (apenas super admins)
CREATE POLICY "Super admins can manage deployment config" ON public.deployment_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role = 'super_admin'
      AND ut.is_active = true
    )
  );

-- Inserir feature flags essenciais
INSERT INTO public.feature_flags (key, enabled, description, environment) VALUES
('new_features_enabled', false, 'Habilita novas funcionalidades em desenvolvimento', 'staging'),
('maintenance_mode', false, 'Modo de manutenção do sistema', 'all'),
('advanced_logging', true, 'Logs detalhados para debug', 'staging'),
('performance_monitoring', true, 'Monitoramento de performance ativo', 'all'),
('safe_deployment_mode', true, 'Modo de deployment seguro com validações', 'all');

-- Inserir configurações padrão
INSERT INTO public.deployment_config (key, value, description) VALUES
('auto_backup_before_deploy', '"true"', 'Criar backup automático antes de qualquer deployment'),
('require_validation_pass', '"true"', 'Exigir que todas as validações passem antes do deploy'),
('max_downtime_minutes', '5', 'Tempo máximo de downtime aceitável'),
('rollback_on_error_threshold', '10', 'Número de erros que dispara rollback automático'),
('health_check_interval_minutes', '5', 'Intervalo entre health checks automáticos');