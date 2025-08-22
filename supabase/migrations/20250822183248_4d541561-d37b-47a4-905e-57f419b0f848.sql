-- 1) Criar enum com valores corretos (CAIXA ALTA)
CREATE TYPE public.nf_status AS ENUM ('ARMAZENADA', 'SOLICITADA', 'CONFIRMADA');

-- 2) Atualizar dados existentes para valores corretos
UPDATE public.notas_fiscais 
SET status = CASE 
  WHEN status IN ('Armazenada', 'armazenada') THEN 'ARMAZENADA'
  WHEN status IN ('Ordem Solicitada', 'Solicitada', 'solicitada') THEN 'SOLICITADA'
  WHEN status IN ('Solicitação Confirmada', 'Confirmada', 'confirmada') THEN 'CONFIRMADA'
  ELSE 'ARMAZENADA'
END;

-- 3) Remover default, alterar tipo e recolocar default
ALTER TABLE public.notas_fiscais ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.notas_fiscais ALTER COLUMN status TYPE nf_status USING status::nf_status;
ALTER TABLE public.notas_fiscais ALTER COLUMN status SET DEFAULT 'ARMAZENADA'::nf_status;