-- Criar bucket para documentos financeiros
INSERT INTO storage.buckets (id, name, public) VALUES ('financeiro-docs', 'financeiro-docs', false);

-- Criar tabela de documentos financeiros
CREATE TABLE public.documentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  numero_cte TEXT NOT NULL,
  data_vencimento DATE NOT NULL,
  valor NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'Em aberto' CHECK (status IN ('Em aberto', 'Pago', 'Vencido')),
  observacoes TEXT,
  arquivo_boleto_path TEXT,
  arquivo_cte_path TEXT,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_documentos_financeiros_transportadora ON public.documentos_financeiros(transportadora_id);
CREATE INDEX idx_documentos_financeiros_cliente ON public.documentos_financeiros(cliente_id);
CREATE INDEX idx_documentos_financeiros_status ON public.documentos_financeiros(status);
CREATE INDEX idx_documentos_financeiros_vencimento ON public.documentos_financeiros(data_vencimento);

-- Habilitar RLS
ALTER TABLE public.documentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos financeiros
CREATE POLICY "Admin e operadores podem gerenciar documentos de sua transportadora" 
ON public.documentos_financeiros 
FOR ALL 
TO authenticated 
USING (
  transportadora_id = get_user_transportadora(auth.uid()) AND 
  (has_role(auth.uid(), 'admin_transportadora'::user_role) OR has_role(auth.uid(), 'operador'::user_role))
);

CREATE POLICY "Clientes podem visualizar seus documentos financeiros" 
ON public.documentos_financeiros 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_id 
    AND c.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Políticas de Storage para documentos financeiros
CREATE POLICY "Transportadora pode upload de documentos" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'financeiro-docs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Transportadora pode visualizar seus documentos" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'financeiro-docs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Clientes podem baixar documentos de suas CTEs" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'financeiro-docs' AND 
  EXISTS (
    SELECT 1 FROM public.documentos_financeiros df
    JOIN public.clientes c ON df.cliente_id = c.id
    WHERE (storage.foldername(name))[2] = df.numero_cte
    AND c.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_documentos_financeiros_updated_at
BEFORE UPDATE ON public.documentos_financeiros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar status vencido automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_status_vencidos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documentos_financeiros 
  SET status = 'Vencido', updated_at = now()
  WHERE data_vencimento < CURRENT_DATE 
  AND status = 'Em aberto';
END;
$$;