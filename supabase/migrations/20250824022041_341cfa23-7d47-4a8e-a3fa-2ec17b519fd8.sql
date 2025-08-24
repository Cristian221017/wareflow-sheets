-- 1) Tabela de vínculo: usuário ↔ cliente
create table if not exists public.user_clientes (
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cliente_id)
);

alter table public.user_clientes enable row level security;

-- Política básica: o usuário só enxerga seus próprios vínculos (opcional, útil pra debug)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='user_clientes' and policyname='user_clientes_self'
  ) then
    create policy user_clientes_self on public.user_clientes
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- 2) RLS de documentos financeiros: trocar "email igual" por vínculo user↔cliente
do $$
begin
  -- remove a policy antiga baseada em e-mail, se existir
  if exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='documentos_financeiros' 
      and policyname='Clientes podem visualizar seus documentos financeiros'
  ) then
    drop policy "Clientes podem visualizar seus documentos financeiros" on public.documentos_financeiros;
  end if;

  -- nova policy baseada no vínculo
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='documentos_financeiros' 
      and policyname='Clientes podem visualizar seus documentos (vinculo)'
  ) then
    create policy "Clientes podem visualizar seus documentos (vinculo)" 
    on public.documentos_financeiros
    for select to authenticated
    using (
      cliente_id in (
        select uc.cliente_id from public.user_clientes uc
        where uc.user_id = auth.uid()
      )
    );
  end if;
end $$;

-- 3) Storage: permitir download por vínculo (cliente) e por transportadora (time)
-- OBS: mantemos a policy antiga de upload (prefixo user_id) como está.

-- 3a) Clientes podem baixar documentos do bucket financeiro-docs se houver vínculo
do $$
begin
  if exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects'
      and policyname='Clientes podem baixar documentos de suas CTEs'
  ) then
    drop policy "Clientes podem baixar documentos de suas CTEs" on storage.objects;
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects'
      and policyname='Cliente baixa financeiro por vínculo'
  ) then
    create policy "Cliente baixa financeiro por vínculo"
    on storage.objects
    for select to authenticated
    using (
      bucket_id = 'financeiro-docs'
      and exists (
        select 1 from public.documentos_financeiros df
        where (df.arquivo_boleto_path = name or df.arquivo_cte_path = name)
          and df.cliente_id in (
            select uc.cliente_id from public.user_clientes uc 
            where uc.user_id = auth.uid()
          )
      )
    );
  end if;
end $$;

-- 3b) Operadores/Admin da transportadora podem baixar arquivos da sua transportadora
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects'
      and policyname='Transportadora baixa financeiro por time'
  ) then
    create policy "Transportadora baixa financeiro por time"
    on storage.objects
    for select to authenticated
    using (
      bucket_id = 'financeiro-docs'
      and exists (
        select 1 
        from public.documentos_financeiros df
        where (df.arquivo_boleto_path = name or df.arquivo_cte_path = name)
          and df.transportadora_id = public.get_user_transportadora(auth.uid())
      )
    );
  end if;
end $$;