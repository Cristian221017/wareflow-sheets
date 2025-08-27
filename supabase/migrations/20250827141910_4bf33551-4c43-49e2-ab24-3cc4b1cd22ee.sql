-- Criar o trigger para garantir integridade de tenant
DROP TRIGGER IF EXISTS trg_nf_tenant ON public.notas_fiscais;
CREATE TRIGGER trg_nf_tenant
BEFORE INSERT OR UPDATE ON public.notas_fiscais
FOR EACH ROW EXECUTE FUNCTION public.check_nf_tenant();