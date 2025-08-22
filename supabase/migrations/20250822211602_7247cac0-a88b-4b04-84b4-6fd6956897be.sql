-- Garantir que a tabela notas_fiscais está na publicação realtime
ALTER publication supabase_realtime ADD TABLE public.notas_fiscais;

-- Também publicar pedidos_liberacao e pedidos_liberados para consistência
ALTER publication supabase_realtime ADD TABLE public.pedidos_liberacao;
ALTER publication supabase_realtime ADD TABLE public.pedidos_liberados;