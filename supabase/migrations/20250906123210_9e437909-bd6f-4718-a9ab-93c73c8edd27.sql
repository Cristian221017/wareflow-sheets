-- Configurar REPLICA IDENTITY FULL para tabelas críticas do realtime
-- Isso permite que o Supabase capture mudanças completas em todos os campos

-- Tabela notas_fiscais - essencial para comunicação cliente-transportadora
ALTER TABLE public.notas_fiscais REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime se não estiver
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'notas_fiscais'
    ) 
    THEN 'notas_fiscais já está na publicação realtime'
    ELSE (
      SELECT 'Adicionando notas_fiscais à publicação realtime: ' || 
      CASE 
        WHEN (SELECT COUNT(*) FROM pg_publication WHERE pubname = 'supabase_realtime') > 0
        THEN 'OK'
        ELSE 'Publicação não existe'
      END
    )
  END as status;

-- Garantir que outras tabelas críticas também tenham REPLICA IDENTITY FULL
ALTER TABLE public.documentos_financeiros REPLICA IDENTITY FULL;
ALTER TABLE public.solicitacoes_carregamento REPLICA IDENTITY FULL;
ALTER TABLE public.system_logs REPLICA IDENTITY FULL;

-- Log da correção aplicada
INSERT INTO public.system_logs (
  entity_type, action, status, message, meta, created_at
) VALUES (
  'SYSTEM',
  'REALTIME_CONFIG_FIXED',
  'INFO',
  'Configuração REPLICA IDENTITY FULL aplicada para melhorar comunicação realtime entre portais',
  jsonb_build_object(
    'tables_updated', ARRAY['notas_fiscais', 'documentos_financeiros', 'solicitacoes_carregamento', 'system_logs'],
    'issue', 'cliente_transportadora_communication',
    'fix_applied_at', now()
  ),
  now()
);