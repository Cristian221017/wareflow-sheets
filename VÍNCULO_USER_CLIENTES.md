# ⚠️ AÇÃO NECESSÁRIA: Criar vínculos user_clientes

## Problema detectado
As NFs criadas no portal da transportadora não aparecem no portal do cliente porque **não existem vínculos na tabela `user_clientes`**.

A tabela está vazia, então mesmo com as policies RLS corretas, os clientes não conseguem ver suas NFs.

## Solução: Criar vínculos automáticos

Execute este SQL no painel do Supabase para criar vínculos baseados no email:

```sql
-- Criar vínculos entre usuários e clientes baseado no email
INSERT INTO public.user_clientes (user_id, cliente_id)
SELECT DISTINCT p.user_id, c.id 
FROM public.profiles p
JOIN public.clientes c ON LOWER(TRIM(c.email)) = LOWER(TRIM(p.email))
WHERE c.status = 'ativo'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_clientes uc 
    WHERE uc.user_id = p.user_id AND uc.cliente_id = c.id
  );
```

## Como criar vínculos para novos clientes

**Opção 1: Via função SQL (recomendado)**
```sql
-- Função para criar vínculo automaticamente
CREATE OR REPLACE FUNCTION public.create_user_cliente_link_by_email(p_client_email text)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_cliente_id uuid;
BEGIN
  -- Buscar user_id pelo email
  SELECT user_id INTO v_user_id 
  FROM public.profiles 
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_client_email));
  
  -- Buscar cliente_id pelo email
  SELECT id INTO v_cliente_id 
  FROM public.clientes 
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_client_email)) 
  AND status = 'ativo';
  
  -- Se ambos existem, criar vínculo
  IF v_user_id IS NOT NULL AND v_cliente_id IS NOT NULL THEN
    INSERT INTO public.user_clientes (user_id, cliente_id)
    VALUES (v_user_id, v_cliente_id)
    ON CONFLICT (user_id, cliente_id) DO NOTHING;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exemplo de uso:
-- SELECT public.create_user_cliente_link_by_email('cliente@exemplo.com');
```

**Opção 2: Via painel administrativo**
Adicione na tela de administração um botão para "Sincronizar vínculos" que execute a query acima.

## Testando a correção

1. Execute o SQL acima para criar os vínculos
2. Confirme que existem registros: `SELECT * FROM public.user_clientes;`
3. Teste login como cliente e veja se as NFs aparecem
4. Teste criar nova NF no portal da transportadora
5. Confirme que aparece imediatamente no portal do cliente

## Políticas RLS já implementadas

✅ Policies de NFs baseadas em `user_clientes` já criadas
✅ Trigger de validação de tenant implementado  
✅ Constraint NOT NULL em `cliente_id` adicionada
✅ Função RPC `nf_listar_do_cliente` criada

## Próximos passos

1. **Execute o SQL de vínculos AGORA**
2. Teste que NFs aparecem no portal do cliente
3. Configure processo para novos clientes (automático via trigger ou manual via admin)

**Status: 🔴 BLOQUEANTE - Vínculos precisam ser criados para sistema funcionar**