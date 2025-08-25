-- Corrigir a última função sem search_path
CREATE OR REPLACE FUNCTION public.trigger_refresh_dashboards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Usar pg_notify para refresh assíncrono
  PERFORM pg_notify('dashboard_refresh', 'update');
  RETURN COALESCE(NEW, OLD);
END;
$$;