-- Melhorar esquema event_log para logs da aplicação
CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('INFO','WARN','ERROR')),
  entity_type text,
  action text,
  message text,
  meta jsonb DEFAULT '{}',
  actor_role text,
  correlation_id text,
  tenant_id uuid,
  user_id uuid
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON public.event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_level ON public.event_log (level);
CREATE INDEX IF NOT EXISTS idx_event_log_tenant ON public.event_log (tenant_id);

-- Habilitar realtime para event_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_log;

-- RLS seguras para event_log
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Política de leitura: usuários autenticados podem ver logs
CREATE POLICY "event_log_select_authenticated"
ON public.event_log FOR SELECT
TO authenticated
USING (true);

-- Política de inserção: qualquer usuário autenticado pode inserir logs
CREATE POLICY "event_log_insert_authenticated"
ON public.event_log FOR INSERT
TO authenticated
WITH CHECK (true);