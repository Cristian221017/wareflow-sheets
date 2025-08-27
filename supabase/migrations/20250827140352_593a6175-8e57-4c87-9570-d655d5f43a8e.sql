-- Correções RLS e constraints para NFs aparecerem no portal do cliente

-- 1. Recrear policies robustas baseadas em user_clientes
DROP POLICY IF EXISTS "nf_select_clientes" ON public.notas_fiscais;
DROP POLICY IF EXISTS "nf_select_transportadora" ON public.notas_fiscais;
DROP POLICY IF EXISTS "nf_insert_transportadora" ON public.notas_fiscais;

-- Policy para CLIENTE (SELECT) baseada no vínculo user_clientes
CREATE POLICY "nf_select_clientes"
ON public.notas_fiscais
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_clientes uc
    WHERE uc.user_id = auth.uid()
      AND uc.cliente_id = notas_fiscais.cliente_id
  )
);

-- Policy para TRANSPORTADORA (SELECT/INSERT)
CREATE POLICY "nf_select_transportadora"
ON public.notas_fiscais
FOR SELECT
TO authenticated
USING (
  notas_fiscais.transportadora_id = get_user_transportadora(auth.uid())
);

CREATE POLICY "nf_insert_transportadora"
ON public.notas_fiscais
FOR INSERT
TO authenticated
WITH CHECK (
  transportadora_id = get_user_transportadora(auth.uid())
);

-- 2. Constraint para evitar NFs "soltas"
ALTER TABLE public.notas_fiscais
  ALTER COLUMN cliente_id SET NOT NULL;

-- 3. Trigger para validar coerência tenant
CREATE OR REPLACE FUNCTION public.check_nf_tenant()
RETURNS trigger AS $$
BEGIN
  IF (SELECT transportadora_id FROM public.clientes WHERE id = NEW.cliente_id)
     <> NEW.transportadora_id THEN
    RAISE EXCEPTION 'Cliente não pertence à transportadora desta NF';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf_tenant ON public.notas_fiscais;
CREATE TRIGGER trg_nf_tenant
BEFORE INSERT OR UPDATE ON public.notas_fiscais
FOR EACH ROW EXECUTE FUNCTION public.check_nf_tenant();

-- 4. RPC para listar NFs do cliente (evita filtros errados no front)
CREATE OR REPLACE FUNCTION public.nf_listar_do_cliente(p_status text DEFAULT NULL)
RETURNS SETOF public.notas_fiscais
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT nf.*
  FROM public.notas_fiscais nf
  WHERE EXISTS (
    SELECT 1
    FROM public.user_clientes uc
    WHERE uc.user_id = auth.uid()
      AND uc.cliente_id = nf.cliente_id
  )
  AND (p_status IS NULL OR nf.status = p_status)
  ORDER BY nf.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.nf_listar_do_cliente(text) TO authenticated;