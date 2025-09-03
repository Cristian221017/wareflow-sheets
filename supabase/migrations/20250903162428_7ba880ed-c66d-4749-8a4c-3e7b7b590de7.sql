-- Habilitar realtime para notas_fiscais
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_fiscais;