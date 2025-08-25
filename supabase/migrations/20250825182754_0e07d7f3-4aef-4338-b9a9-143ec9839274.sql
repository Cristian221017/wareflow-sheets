-- Create event logging system
DO $$ BEGIN
    CREATE TYPE public.log_level AS ENUM ('INFO','WARN','ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.event_log(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_role text,
  transportadora_id uuid,
  cliente_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  status public.log_level NOT NULL DEFAULT 'INFO',
  message text,
  meta jsonb DEFAULT '{}'
);

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Create log_event function
CREATE OR REPLACE FUNCTION public.log_event(
  p_entity_type text, 
  p_action text, 
  p_status public.log_level DEFAULT 'INFO', 
  p_message text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL, 
  p_transportadora_id uuid DEFAULT NULL, 
  p_cliente_id uuid DEFAULT NULL, 
  p_meta jsonb DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_transportadoras 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    v_user_role := 'cliente';
  END IF;

  INSERT INTO public.event_log(
    actor_user_id, actor_role, transportadora_id, cliente_id,
    entity_type, entity_id, action, status, message, meta
  ) VALUES (
    auth.uid(), 
    v_user_role,
    COALESCE(p_transportadora_id, public.get_user_transportadora(auth.uid())),
    p_cliente_id, 
    p_entity_type, 
    p_entity_id, 
    p_action, 
    p_status, 
    p_message, 
    COALESCE(p_meta, '{}'::jsonb)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.log_event(text,text,public.log_level,text,uuid,uuid,uuid,jsonb) TO authenticated;

-- Create feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags(
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Create policies for feature flags
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='feature_flags' 
    AND policyname='Everyone can view feature flags'
  ) THEN
    CREATE POLICY "Everyone can view feature flags" 
    ON public.feature_flags 
    FOR SELECT 
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='feature_flags' 
    AND policyname='Super admins can manage feature flags'
  ) THEN
    CREATE POLICY "Super admins can manage feature flags" 
    ON public.feature_flags 
    FOR ALL 
    USING (has_role(auth.uid(), 'super_admin'::user_role));
  END IF;
END $$;

-- Create v2 of file path RPC
CREATE OR REPLACE FUNCTION public.set_financeiro_file_path_v2(
  p_doc_id uuid,
  p_kind text,   -- 'boleto' | 'cte'
  p_path text
) RETURNS public.documentos_financeiros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_doc public.documentos_financeiros;
BEGIN
  IF p_kind NOT IN ('boleto','cte') THEN
    RAISE EXCEPTION 'tipo inválido: %', p_kind USING ERRCODE = '22023';
  END IF;

  UPDATE public.documentos_financeiros
     SET arquivo_boleto_path = CASE WHEN p_kind='boleto' THEN p_path ELSE arquivo_boleto_path END,
         arquivo_cte_path    = CASE WHEN p_kind='cte'    THEN p_path ELSE arquivo_cte_path END,
         updated_at = now()
   WHERE id = p_doc_id
     AND transportadora_id = public.get_user_transportadora(auth.uid())
  RETURNING * INTO v_doc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma linha atualizada (docId inválido ou RLS)' USING ERRCODE = 'P0002';
  END IF;

  -- Log resiliente: não falha se logs não existirem
  BEGIN
    PERFORM public.log_event(
      'FINANCEIRO',
      'DOC_PATH_SET',
      'INFO',
      'Path salvo',
      p_doc_id,
      v_doc.transportadora_id,
      v_doc.cliente_id,
      jsonb_build_object('kind', p_kind, 'path', p_path, 'numero_cte', v_doc.numero_cte)
    );
  EXCEPTION WHEN undefined_table OR undefined_function THEN
    NULL;
  END;

  RETURN v_doc;
END $$;

GRANT EXECUTE ON FUNCTION public.set_financeiro_file_path_v2(uuid, text, text) TO authenticated;

-- Ensure RLS policy for documentos_financeiros updates exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='documentos_financeiros'
      AND policyname='Transportadora atualiza seus documentos financeiros'
  ) THEN
    CREATE POLICY "Transportadora atualiza seus documentos financeiros"
    ON public.documentos_financeiros
    FOR UPDATE TO authenticated
    USING (transportadora_id = public.get_user_transportadora(auth.uid()))
    WITH CHECK (transportadora_id = public.get_user_transportadora(auth.uid()));
  END IF;
END $$;

-- Add policies for event_log
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='event_log' 
    AND policyname='Super admins can view all events'
  ) THEN
    CREATE POLICY "Super admins can view all events"
    ON public.event_log
    FOR SELECT
    USING (has_role(auth.uid(), 'super_admin'::user_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='event_log' 
    AND policyname='Transportadoras can view their events'
  ) THEN
    CREATE POLICY "Transportadoras can view their events"
    ON public.event_log
    FOR SELECT
    USING (transportadora_id = get_user_transportadora(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='event_log' 
    AND policyname='Clientes can view their events'
  ) THEN
    CREATE POLICY "Clientes can view their events"
    ON public.event_log
    FOR SELECT
    USING (
      cliente_id IN (
        SELECT c.id
        FROM clientes c
        JOIN profiles p ON p.email = c.email
        WHERE p.user_id = auth.uid() AND c.status = 'ativo'
      )
    );
  END IF;
END $$;

-- Insert some default feature flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('enable_new_financeiro_v2', false, 'Enable new financeiro v2 features'),
  ('enable_realtime_notifications', true, 'Enable realtime notifications'),
  ('enable_advanced_logging', true, 'Enable advanced event logging')
ON CONFLICT (key) DO NOTHING;