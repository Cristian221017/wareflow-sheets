-- Corrigir search_path nas funções para atender ao linter de segurança
drop function if exists public.nf_solicitar(uuid, uuid);
drop function if exists public.nf_confirmar(uuid, uuid);
drop function if exists public.nf_recusar(uuid, uuid);

create or replace function nf_solicitar(p_nf_id uuid, p_user_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update notas_fiscais
     set status='SOLICITADA',
         requested_by=p_user_id,
         requested_at=now(),
         approved_by=null,
         approved_at=null
   where id=p_nf_id and status='ARMAZENADA';
  if not found then
    raise exception 'Transição inválida: só é possível SOLICITAR quando ARMAZENADA';
  end if;
end; $$;

create or replace function nf_confirmar(p_nf_id uuid, p_user_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update notas_fiscais
     set status='CONFIRMADA',
         approved_by=p_user_id,
         approved_at=now()
   where id=p_nf_id and status='SOLICITADA';
  if not found then
    raise exception 'Transição inválida: só é possível CONFIRMAR quando SOLICITADA';
  end if;
end; $$;

create or replace function nf_recusar(p_nf_id uuid, p_user_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
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