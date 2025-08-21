-- Enable realtime for WMS tables to ensure proper synchronization
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos_liberacao REPLICA IDENTITY FULL;  
ALTER TABLE public.pedidos_liberados REPLICA IDENTITY FULL;

-- Add tables to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_fiscais;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_liberacao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_liberados;