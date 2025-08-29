-- Tabela de solicitações
create table if not exists public.solicitacoes_carregamento (
  id uuid primary key default gen_random_uuid(),
  nf_id uuid not null references public.notas_fiscais(id) on delete cascade,
  transportadora_id uuid not null references public.transportadoras(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,

  data_agendamento timestamptz,
  observacoes text,
  anexos jsonb not null default '[]'::jsonb,   -- [{name, path, size, contentType}]

  status text not null default 'PENDENTE',     -- PENDENTE | APROVADA | RECUSADA
  requested_by uuid not null default auth.uid(),
  requested_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sc_nf on public.solicitacoes_carregamento(nf_id);
create index if not exists idx_sc_transportadora on public.solicitacoes_carregamento(transportadora_id);
create index if not exists idx_sc_cliente on public.solicitacoes_carregamento(cliente_id);

-- RLS (políticas)
alter table public.solicitacoes_carregamento enable row level security;

-- Cliente pode ver suas solicitações (via vínculo user_clientes)
drop policy if exists sc_select_cliente on public.solicitacoes_carregamento;
create policy sc_select_cliente
on public.solicitacoes_carregamento for select
to authenticated
using (
  exists (
    select 1 from public.user_clientes uc
    where uc.user_id = auth.uid()
      and uc.cliente_id = solicitacoes_carregamento.cliente_id
  )
);

-- Cliente pode inserir solicitação somente da sua NF
drop policy if exists sc_insert_cliente on public.solicitacoes_carregamento;
create policy sc_insert_cliente
on public.solicitacoes_carregamento for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_clientes uc
    join public.notas_fiscais nf on nf.id = solicitacoes_carregamento.nf_id
    where uc.user_id = auth.uid()
      and uc.cliente_id = solicitacoes_carregamento.cliente_id
      and nf.cliente_id = solicitacoes_carregamento.cliente_id
  )
);

-- Transportadora (ou super_admin) pode ver
drop policy if exists sc_select_transportadora on public.solicitacoes_carregamento;
create policy sc_select_transportadora
on public.solicitacoes_carregamento for select
to authenticated
using (
  public.has_role(auth.uid(),'super_admin')
  or exists (
    select 1 from public.user_transportadoras ut
    where ut.user_id = auth.uid()
      and ut.is_active = true
      and ut.transportadora_id = solicitacoes_carregamento.transportadora_id
  )
);

-- Transportadora (ou super_admin) pode atualizar status
drop policy if exists sc_update_transportadora on public.solicitacoes_carregamento;
create policy sc_update_transportadora
on public.solicitacoes_carregamento for update
to authenticated
using (
  public.has_role(auth.uid(),'super_admin')
  or exists (
    select 1 from public.user_transportadoras ut
    where ut.user_id = auth.uid()
      and ut.is_active = true
      and ut.transportadora_id = solicitacoes_carregamento.transportadora_id
  )
)
with check (true);

-- RPC atômica nf_solicitar_agendamento
create or replace function public.nf_solicitar_agendamento(
  p_nf_id uuid,
  p_data_agendamento timestamptz,
  p_observacoes text,
  p_anexos jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nf record;
  v_cliente_id uuid;
  v_transportadora_id uuid;
  v_id uuid;
begin
  -- Carrega NF e verifica vínculo do cliente logado
  select nf.id, nf.cliente_id, nf.transportadora_id
  into v_nf
  from public.notas_fiscais nf
  where nf.id = p_nf_id;

  if v_nf.id is null then
    raise exception 'NF não encontrada';
  end if;

  -- Checa vínculo user -> cliente
  if not exists (
    select 1 from public.user_clientes uc
    where uc.user_id = auth.uid()
      and uc.cliente_id = v_nf.cliente_id
  ) then
    raise exception 'Usuário não vinculado ao cliente desta NF';
  end if;

  v_cliente_id := v_nf.cliente_id;
  v_transportadora_id := v_nf.transportadora_id;

  -- Cria solicitação
  insert into public.solicitacoes_carregamento(
    nf_id, cliente_id, transportadora_id,
    data_agendamento, observacoes, anexos, status, requested_by
  ) values (
    p_nf_id, v_cliente_id, v_transportadora_id,
    p_data_agendamento, p_observacoes, coalesce(p_anexos,'[]'::jsonb),
    'PENDENTE', auth.uid()
  )
  returning id into v_id;

  -- Atualiza NF para SOLICITADA (mantém o fluxo original)
  update public.notas_fiscais
  set status = 'SOLICITADA',
      requested_by = auth.uid(),
      requested_at = now()
  where id = p_nf_id;

  -- Log opcional
  perform public.log_system_event(
    'NF','SOLICITADA','INFO',
    'Solicitação com agendamento criada',
    p_nf_id, v_transportadora_id, v_cliente_id,
    jsonb_build_object(
      'nfId', p_nf_id,
      'solicitacaoId', v_id,
      'data_agendamento', p_data_agendamento,
      'has_anexos', jsonb_typeof(coalesce(p_anexos,'[]'::jsonb)) = 'array'
    )
  );

  return v_id;
end;
$$;

grant execute on function public.nf_solicitar_agendamento(uuid,timestamptz,text,jsonb) to authenticated;

-- Trigger para updated_at
create trigger update_solicitacoes_carregamento_updated_at
before update on public.solicitacoes_carregamento
for each row
execute function public.set_updated_at();

-- Storage bucket para anexos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solicitacoes-anexos', 
  'solicitacoes-anexos', 
  false,
  10485760, -- 10MB
  array['application/pdf','image/jpeg','image/png','image/jpg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Políticas para o storage
create policy "Cliente pode upload de anexos"
on storage.objects for insert
with check (
  bucket_id = 'solicitacoes-anexos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] in (
    select c.id::text
    from public.user_clientes uc
    join public.clientes c on c.id = uc.cliente_id
    where uc.user_id = auth.uid()
  )
);

create policy "Cliente e transportadora podem baixar anexos"
on storage.objects for select
using (
  bucket_id = 'solicitacoes-anexos'
  and (
    -- Cliente pode ver seus próprios anexos
    (storage.foldername(name))[1] in (
      select c.id::text
      from public.user_clientes uc
      join public.clientes c on c.id = uc.cliente_id
      where uc.user_id = auth.uid()
    )
    or
    -- Transportadora pode ver anexos de suas solicitações
    exists (
      select 1
      from public.user_transportadoras ut
      join public.solicitacoes_carregamento sc on sc.transportadora_id = ut.transportadora_id
      where ut.user_id = auth.uid()
        and ut.is_active = true
        and (storage.foldername(name))[2] = sc.id::text
    )
    or
    -- Super admin pode ver tudo
    public.has_role(auth.uid(), 'super_admin')
  )
);