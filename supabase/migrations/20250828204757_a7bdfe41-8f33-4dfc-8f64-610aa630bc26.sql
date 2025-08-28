-- Adicionar campos para informações de solicitação de carregamento
ALTER TABLE public.notas_fiscais 
ADD COLUMN data_agendamento_entrega DATE,
ADD COLUMN observacoes_solicitacao TEXT,
ADD COLUMN documentos_anexos JSONB DEFAULT '[]'::JSONB;