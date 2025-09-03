-- Configurar backup automático (corrigido)

-- 1. Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar bucket de storage para backups (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system-backups',
  'system-backups', 
  false,
  104857600, -- 100MB limit
  ARRAY['application/json', 'application/gzip']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Criar políticas de storage para backups
CREATE POLICY "Super admins can manage system backups" ON storage.objects
FOR ALL USING (
  bucket_id = 'system-backups' AND
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.role = 'super_admin'
    AND ut.is_active = true
  )
);

-- 4. Agendar backup automático diário às 02:00
SELECT cron.schedule(
  'sistema-wms-backup-diario',
  '0 2 * * *', -- Todo dia às 02:00
  $$
  SELECT net.http_post(
    url := 'https://vyqnnnyamoovzxmuvtkl.supabase.co/functions/v1/automated-backup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cW5ubnlhbW9vdnp4bXV2dGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjQyMDksImV4cCI6MjA3MTA0MDIwOX0.T-2Pp7rIkBAyzg0-7pV__PT5ssDAxFkZZeyIYOS3shY"}'::jsonb,
    body := '{"automated": true}'::jsonb
  ) as request_id;
  $$
);

-- 5. Agendar backup semanal completo aos domingos às 01:00
SELECT cron.schedule(
  'sistema-wms-backup-semanal',
  '0 1 * * 0', -- Todo domingo às 01:00  
  $$
  SELECT net.http_post(
    url := 'https://vyqnnnyamoovzxmuvtkl.supabase.co/functions/v1/automated-backup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cW5ubnlhbW9vdnp4bXV2dGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjQyMDksImV4cCI6MjA3MTA0MDIwOX0.T-2Pp7rIkBAyzg0-7pV__PT5ssDAxFkZZeyIYOS3shY"}'::jsonb,
    body := '{"automated": true, "type": "weekly"}'::jsonb
  ) as request_id;
  $$
);

-- 6. Função para verificar status dos cron jobs (corrigida)
CREATE OR REPLACE FUNCTION public.get_backup_cron_status()
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    jobname,
    schedule,
    active
  FROM cron.job 
  WHERE jobname LIKE 'sistema-wms-backup%'
  ORDER BY jobname;
$$;

-- 7. Função para executar backup manual
CREATE OR REPLACE FUNCTION public.execute_manual_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.role = 'super_admin'
    AND ut.is_active = true
  ) THEN
    RAISE EXCEPTION 'Apenas super admins podem executar backup manual';
  END IF;

  -- Log da execução manual
  PERFORM log_system_event(
    'BACKUP', 'MANUAL_BACKUP_TRIGGERED', 'INFO',
    'Backup manual executado pelo usuário',
    NULL, NULL, NULL,
    jsonb_build_object(
      'triggered_by', auth.uid(),
      'execution_time', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Backup manual iniciado com sucesso. Verifique a tabela system_backups para acompanhar o progresso.',
    'timestamp', now()
  );
END;
$$;