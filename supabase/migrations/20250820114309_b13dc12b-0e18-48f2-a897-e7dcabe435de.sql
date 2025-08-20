-- Adicionar campo para email de notificação de boleto na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN email_notificacao_boleto text;