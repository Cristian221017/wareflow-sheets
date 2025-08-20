-- Adicionar campos para integrações externas nas tabelas principais

-- Tabela clientes - campos para integração
ALTER TABLE public.clientes 
ADD COLUMN external_id text,
ADD COLUMN edi_id text,
ADD COLUMN integration_metadata jsonb DEFAULT '{}',
ADD COLUMN last_sync timestamp with time zone,
ADD COLUMN sync_status text DEFAULT 'pending';

-- Tabela notas_fiscais - campos para integração
ALTER TABLE public.notas_fiscais 
ADD COLUMN nfe_key text,
ADD COLUMN external_id text,
ADD COLUMN edi_id text,
ADD COLUMN integration_metadata jsonb DEFAULT '{}',
ADD COLUMN last_sync timestamp with time zone,
ADD COLUMN sync_status text DEFAULT 'pending';

-- Tabela pedidos_liberacao - campos para integração
ALTER TABLE public.pedidos_liberacao 
ADD COLUMN external_id text,
ADD COLUMN edi_id text,
ADD COLUMN integration_metadata jsonb DEFAULT '{}',
ADD COLUMN last_sync timestamp with time zone,
ADD COLUMN sync_status text DEFAULT 'pending';

-- Tabela pedidos_liberados - campos para integração
ALTER TABLE public.pedidos_liberados 
ADD COLUMN external_id text,
ADD COLUMN edi_id text,
ADD COLUMN integration_metadata jsonb DEFAULT '{}',
ADD COLUMN last_sync timestamp with time zone,
ADD COLUMN sync_status text DEFAULT 'pending';

-- Tabela documentos_financeiros - campos para integração
ALTER TABLE public.documentos_financeiros 
ADD COLUMN external_id text,
ADD COLUMN edi_id text,
ADD COLUMN integration_metadata jsonb DEFAULT '{}',
ADD COLUMN last_sync timestamp with time zone,
ADD COLUMN sync_status text DEFAULT 'pending';

-- Nova tabela para logs de integração
CREATE TABLE public.integration_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type text NOT NULL, -- 'api', 'edi', 'notfis', 'proceda'
  operation text NOT NULL, -- 'sync', 'send', 'receive', 'error'
  table_name text NOT NULL,
  record_id uuid,
  external_id text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'error', 'retrying'
  message text,
  request_data jsonb DEFAULT '{}',
  response_data jsonb DEFAULT '{}',
  error_details jsonb DEFAULT '{}',
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Nova tabela para mapeamento de status entre sistemas
CREATE TABLE public.status_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type text NOT NULL,
  table_name text NOT NULL,
  internal_status text NOT NULL,
  external_status text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(integration_type, table_name, internal_status)
);

-- Nova tabela para configurações de integração
CREATE TABLE public.integration_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id uuid NOT NULL,
  integration_type text NOT NULL, -- 'api', 'edi', 'notfis', 'proceda'
  is_active boolean DEFAULT false,
  endpoint_url text,
  api_key text,
  username text,
  password text,
  certificate_path text,
  config_data jsonb DEFAULT '{}',
  last_sync timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(transportadora_id, integration_type)
);

-- Índices para performance
CREATE INDEX idx_integration_logs_type_status ON public.integration_logs(integration_type, status);
CREATE INDEX idx_integration_logs_table_record ON public.integration_logs(table_name, record_id);
CREATE INDEX idx_integration_logs_created_at ON public.integration_logs(created_at);
CREATE INDEX idx_clientes_external_id ON public.clientes(external_id);
CREATE INDEX idx_notas_fiscais_nfe_key ON public.notas_fiscais(nfe_key);
CREATE INDEX idx_notas_fiscais_external_id ON public.notas_fiscais(external_id);

-- Trigger para atualizar updated_at em integration_logs
CREATE TRIGGER update_integration_logs_updated_at
  BEFORE UPDATE ON public.integration_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em integration_configs
CREATE TRIGGER update_integration_configs_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies para integration_logs
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integration logs from their transportadora"
ON public.integration_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true
  )
);

CREATE POLICY "Admin can manage integration logs from their transportadora"
ON public.integration_logs FOR ALL
USING (
  has_role(auth.uid(), 'admin_transportadora'::user_role)
);

-- RLS policies para status_mappings
ALTER TABLE public.status_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status mappings"
ON public.status_mappings FOR SELECT
USING (true);

CREATE POLICY "Admin can manage status mappings"
ON public.status_mappings FOR ALL
USING (
  has_role(auth.uid(), 'admin_transportadora'::user_role) OR
  has_role(auth.uid(), 'super_admin'::user_role)
);

-- RLS policies para integration_configs
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integration configs from their transportadora"
ON public.integration_configs FOR SELECT
USING (transportadora_id = get_user_transportadora(auth.uid()));

CREATE POLICY "Admin can manage integration configs from their transportadora"
ON public.integration_configs FOR ALL
USING (
  transportadora_id = get_user_transportadora(auth.uid()) AND
  has_role(auth.uid(), 'admin_transportadora'::user_role)
);

-- Inserir mapeamentos de status padrão
INSERT INTO public.status_mappings (integration_type, table_name, internal_status, external_status, description) VALUES
-- Para notas fiscais
('edi', 'notas_fiscais', 'Armazenada', 'STORED', 'Mercadoria armazenada no depósito'),
('edi', 'notas_fiscais', 'Em separação', 'PICKING', 'Mercadoria sendo separada'),
('edi', 'notas_fiscais', 'Liberada para carregar', 'READY_TO_LOAD', 'Liberada para carregamento'),
('edi', 'notas_fiscais', 'Carregamento solicitado', 'LOAD_REQUESTED', 'Carregamento foi solicitado'),

-- Para pedidos de liberação
('edi', 'pedidos_liberacao', 'Em análise', 'PENDING', 'Aguardando análise'),
('edi', 'pedidos_liberacao', 'Confirmado', 'CONFIRMED', 'Pedido confirmado'),

-- Para documentos financeiros
('edi', 'documentos_financeiros', 'Em aberto', 'OPEN', 'Documento em aberto'),
('edi', 'documentos_financeiros', 'Pago', 'PAID', 'Documento pago'),
('edi', 'documentos_financeiros', 'Vencido', 'OVERDUE', 'Documento vencido');