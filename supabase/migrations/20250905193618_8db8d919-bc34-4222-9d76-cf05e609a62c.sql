-- Adicionar campo numero_boleto na tabela documentos_financeiros
ALTER TABLE public.documentos_financeiros 
ADD COLUMN numero_boleto TEXT;