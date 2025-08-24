-- Criar o vínculo entre o usuário cliente existente e o registro na tabela clientes
insert into public.user_clientes (user_id, cliente_id)
values ('8ce8505d-e141-4a44-8772-a6a5e8e77f40', '5082b23c-80b9-4da9-bc20-d12b36b9086c')
on conflict (user_id, cliente_id) do nothing;