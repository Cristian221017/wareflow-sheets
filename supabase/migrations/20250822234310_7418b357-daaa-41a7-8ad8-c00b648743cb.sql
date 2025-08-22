-- Configurar real-time para a tabela notas_fiscais
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;