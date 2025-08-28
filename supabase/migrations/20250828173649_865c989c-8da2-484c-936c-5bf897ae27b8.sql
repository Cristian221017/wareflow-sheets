-- Fix RLS policies para notas_fiscais baseadas em vínculos, não email
drop policy if exists "Clientes podem visualizar suas próprias notas fiscais" on public.notas_fiscais;
drop policy if exists "Users can view notas fiscais from their transportadora" on public.notas_fiscais;

-- Clients: ver NFs dos clientes vinculados
create policy "Clientes veem NFs por vínculo" on public.notas_fiscais
for select to authenticated
using (
  exists (
    select 1 from public.user_clientes uc
    where uc.user_id = auth.uid()
      and uc.cliente_id = notas_fiscais.cliente_id
  )
);

-- Time da transportadora: ver NFs da sua transportadora
create policy "Transportadora vê suas NFs" on public.notas_fiscais
for select to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or exists (
    select 1 from public.user_transportadoras ut
    where ut.user_id = auth.uid()
      and ut.is_active = true
      and ut.transportadora_id = notas_fiscais.transportadora_id
  )
);

-- Adicionar coluna computada para CNPJ normalizado
alter table clientes
  add column if not exists cnpj_normalizado text
    generated always as (regexp_replace(cnpj, '\D','','g')) stored;

create index if not exists idx_clientes_cnpj_norm on clientes(cnpj_normalizado);