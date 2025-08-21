-- Limpeza completa do fluxo de NFs
-- 1. Remover realtime da tabela notas_fiscais
ALTER TABLE public.notas_fiscais REPLICA IDENTITY DEFAULT;

-- 2. Remover as funções RPC do fluxo
DROP FUNCTION IF EXISTS public.nf_solicitar(uuid, uuid);
DROP FUNCTION IF EXISTS public.nf_confirmar(uuid, uuid);  
DROP FUNCTION IF EXISTS public.nf_recusar(uuid, uuid);

-- 3. Remover as colunas de controle de fluxo
ALTER TABLE public.notas_fiscais 
  DROP COLUMN IF EXISTS requested_by,
  DROP COLUMN IF EXISTS requested_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approved_at;

-- 4. Alterar coluna status de enum para text e voltar valores antigos
ALTER TABLE public.notas_fiscais 
  ALTER COLUMN status TYPE text USING status::text;

-- 5. Atualizar valores para compatibilidade com sistema antigo
UPDATE public.notas_fiscais 
SET status = CASE 
  WHEN status = 'ARMAZENADA' THEN 'Armazenada'
  WHEN status = 'SOLICITADA' THEN 'Ordem Solicitada'  
  WHEN status = 'CONFIRMADA' THEN 'Solicitação Confirmada'
  ELSE 'Armazenada'
END;

-- 6. Definir default como valor antigo
ALTER TABLE public.notas_fiscais 
  ALTER COLUMN status SET DEFAULT 'Armazenada';

-- 7. Remover o enum nf_status
DROP TYPE IF EXISTS nf_status;