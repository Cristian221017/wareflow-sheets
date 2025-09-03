-- Configurar backup automático (versão simplificada)

-- 1. Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Agendar backup automático diário às 02:00 (remover se já existe)
SELECT cron.unschedule('sistema-wms-backup-diario');
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

-- 3. Agendar backup semanal completo aos domingos às 01:00
SELECT cron.unschedule('sistema-wms-backup-semanal');
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

-- 4. Função para verificar status dos cron jobs
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