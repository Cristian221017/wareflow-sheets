-- Tipos
CREATE TYPE IF NOT EXISTS public.log_level AS ENUM ('INFO','WARN','ERROR');

-- Tabela de logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  actor_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role        text,
  transportadora_id uuid,
  cliente_id        uuid,
  entity_type       text NOT NULL,   -- 'NF' | 'FINANCEIRO' | 'AUTH' | 'INTEGRACAO' | 'UI'...
  entity_id         uuid,
  action            text NOT NULL,   -- 'NF_SOLICITAR' | 'NF_CONFIRMAR' | 'DOC_UPLOAD'...
  status            public.log_level NOT NULL DEFAULT 'INFO',
  message           text,
  meta              jsonb DEFAULT '{}',
  correlation_id    uuid DEFAULT gen_random_uuid(),
  ip                inet,
  user_agent        text
);

-- Índices
CREATE INDEX IF NOT EXISTS system_logs_created_at_desc_idx ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_entity_idx ON public.system_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS system_logs_actor_idx ON public.system_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS system_logs_transportadora_idx ON public.system_logs (transportadora_id, created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_cliente_idx ON public.system_logs (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_correlation_idx ON public.system_logs (correlation_id);

-- RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Super Admin vê tudo; admin da transportadora vê só a sua
CREATE POLICY system_logs_super_admin_select ON public.system_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY system_logs_transportadora_select ON public.system_logs
  FOR SELECT TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin')
    AND transportadora_id IS NOT NULL
    AND transportadora_id = get_user_transportadora(auth.uid())
  );

-- Função para registrar evento
CREATE OR REPLACE FUNCTION public.log_system_event(
  p_entity_type text,
  p_action text,
  p_status public.log_level DEFAULT 'INFO',
  p_message text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_transportadora_id uuid DEFAULT NULL,
  p_cliente_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}',
  p_correlation_id uuid DEFAULT NULL
)
RETURNS public.system_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
  v_log public.system_logs;
  v_user_role text;
BEGIN
  -- Obter role do usuário
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  INSERT INTO public.system_logs (
    actor_user_id, actor_role, transportadora_id, cliente_id,
    entity_type, entity_id, action, status, message, meta, correlation_id
  )
  VALUES (
    auth.uid(),
    v_user_role,
    COALESCE(p_transportadora_id, get_user_transportadora(auth.uid())),
    p_cliente_id,
    p_entity_type, p_entity_id, p_action, p_status, p_message, 
    COALESCE(p_meta, '{}'),
    COALESCE(p_correlation_id, gen_random_uuid())
  )
  RETURNING * INTO v_log;

  RETURN v_log;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_system_event(text,text,public.log_level,text,uuid,uuid,uuid,jsonb,uuid) TO authenticated;

-- Função de limpeza (opcional)
CREATE OR REPLACE FUNCTION public.prune_system_logs(p_days int DEFAULT 90)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.system_logs 
  WHERE created_at < now() - (p_days || ' days')::interval;
END $$;