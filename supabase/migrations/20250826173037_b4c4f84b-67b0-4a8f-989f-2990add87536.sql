-- Adicionar colunas necessárias à tabela event_log existente
ALTER TABLE public.event_log 
ADD COLUMN IF NOT EXISTS level text CHECK (level IN ('INFO','WARN','ERROR')),
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS tenant_id uuid,
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Atualizar payload para ter default vazio se for NULL
UPDATE public.event_log SET payload = '{}' WHERE payload IS NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON public.event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_level ON public.event_log (level);
CREATE INDEX IF NOT EXISTS idx_event_log_tenant ON public.event_log (tenant_id);

-- Habilitar realtime para event_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_log;

-- RLS seguras para event_log
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Dropar políticas existentes se houver conflito
DROP POLICY IF EXISTS "event_log_select_authenticated" ON public.event_log;
DROP POLICY IF EXISTS "event_log_insert_authenticated" ON public.event_log;

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