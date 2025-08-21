-- Criar enum e estrutura para fluxo de NFs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'nf_status') then
    create type nf_status as enum ('ARMAZENADA','SOLICITADA','CONFIRMADA');
  end if;
end $$;

-- Adicionar colunas de controle do fluxo na tabela notas_fiscais
alter table notas_fiscais
  add column if not exists status nf_status not null default 'ARMAZENADA',
  add column if not exists requested_by uuid,
  add column if not exists requested_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- Índices para performance
create index if not exists idx_notas_fiscais_status on notas_fiscais(status);
create index if not exists idx_notas_fiscais_requested_at on notas_fiscais(requested_at);
create index if not exists idx_notas_fiscais_approved_at on notas_fiscais(approved_at);

-- RPCs atômicas para transições de status
create or replace function nf_solicitar(p_nf_id uuid, p_user uuid)
returns void language plpgsql security definer as $$
begin
  update notas_fiscais
     set status='SOLICITADA',
         requested_by=p_user,
         requested_at=now(),
         approved_by=null,
         approved_at=null
   where id=p_nf_id and status='ARMAZENADA';
  if not found then
    raise exception 'Transição inválida: só é possível SOLICITAR quando ARMAZENADA';
  end if;
end; $$;

create or replace function nf_confirmar(p_nf_id uuid, p_user uuid)
returns void language plpgsql security definer as $$
begin
  update notas_fiscais
     set status='CONFIRMADA',
         approved_by=p_user,
         approved_at=now()
   where id=p_nf_id and status='SOLICITADA';
  if not found then
    raise exception 'Transição inválida: só é possível CONFIRMAR quando SOLICITADA';
  end if;
end; $$;

create or replace function nf_recusar(p_nf_id uuid, p_user uuid)
returns void language plpgsql security definer as $$
begin
  update notas_fiscais
     set status='ARMAZENADA',
         approved_by=null,
         approved_at=null
   where id=p_nf_id and status='SOLICITADA';
  if not found then
    raise exception 'Transição inválida: só é possível RECUSAR quando SOLICITADA';
  end if;
end; $$;

-- Habilitar realtime para a tabela
alter table notas_fiscais replica identity full;
alter publication supabase_realtime add table notas_fiscais;