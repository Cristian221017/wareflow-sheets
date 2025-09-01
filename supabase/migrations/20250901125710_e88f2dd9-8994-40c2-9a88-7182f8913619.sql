-- Garantir que as tabelas necessárias estão na publicação do realtime
-- Necessário para o sistema de notificações em tempo real funcionar corretamente

-- Adicionar tabelas à publicação do realtime (operação idempotente)
ALTER publication supabase_realtime ADD TABLE public.notas_fiscais;
ALTER publication supabase_realtime ADD TABLE public.solicitacoes_carregamento;
ALTER publication supabase_realtime ADD TABLE public.documentos_financeiros;
ALTER publication supabase_realtime ADD TABLE public.event_log;

-- Garantir que as tabelas têm REPLICA IDENTITY FULL para capturar dados completos
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;
ALTER TABLE public.solicitacoes_carregamento REPLICA IDENTITY FULL;
ALTER TABLE public.documentos_financeiros REPLICA IDENTITY FULL;
ALTER TABLE public.event_log REPLICA IDENTITY FULL;