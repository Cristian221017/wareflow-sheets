# 🛠️ PLANO DE CORREÇÃO URGENTE - SISTEMA WMS

## 🚨 CORREÇÕES CRÍTICAS IMEDIATAS (Prioridade 1)

### 1. Corrigir Search Path nas Funções SQL do Supabase

**Problema:** 2 funções SQL sem `search_path` definido  
**Risco:** Vulnerabilidade de injeção SQL  

**Correção SQL necessária:**
```sql
-- Para todas as funções sem search_path, adicionar:
ALTER FUNCTION function_name() SET search_path TO 'public';

-- Exemplo para as funções detectadas pelo linter:
ALTER FUNCTION get_user_transportadora(uuid) SET search_path TO 'public';
ALTER FUNCTION has_role(uuid, user_role) SET search_path TO 'public';
```

### 2. Habilitar Proteções de Segurança no Supabase

**Problema:** Configurações de segurança desabilitadas  

**Correções no Dashboard Supabase:**
- Authentication > Settings > Password protection: **HABILITAR**
- Authentication > Settings > OTP expiry: Reduzir para **5 minutos**

### 3. Corrigir Race Conditions no AuthContext

**Arquivo:** `src/contexts/AuthContext.tsx`  

**Problema atual (linhas 56-97):**
```typescript
// ❌ PROBLEMÁTICO - Race conditions + timeout inadequado
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Database query timeout')), 3000);
});

setTimeout(() => {
  loadUserProfile(session.user);
}, 0);
```

**Correção necessária:**
```typescript
// ✅ CORRETO - Sem race conditions
const loadUserProfile = async (supabaseUser: SupabaseUser) => {
  try {
    setLoading(true);
    log('Loading user profile for:', supabaseUser.id);
    
    // Usar Promise.allSettled para evitar falha em uma query quebrar tudo
    const [profileResult, roleResult, clienteResult] = await Promise.allSettled([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle(),
      supabase
        .from('user_transportadoras')
        .select('role, is_active, transportadora_id')
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('clientes')
        .select('*')
        .eq('email', supabaseUser.email)
        .eq('status', 'ativo')
        .maybeSingle()
    ]);

    // Processar resultados sem timeout artificial
    const userData = await buildUserFromResults(supabaseUser, profileResult, roleResult, clienteResult);
    
    setUser(userData);
    audit('LOGIN_SUCCESS', 'AUTH', { userId: supabaseUser.id, userEmail: userData.email });
    
  } catch (error) {
    logError('Error loading user profile:', error);
    // Criar usuário fallback seguro apenas se necessário
    const fallbackUser = createSecureFallbackUser(supabaseUser);
    setUser(fallbackUser);
  } finally {
    setLoading(false);
  }
};

// Remover setTimeout desnecessário
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user); // Sem setTimeout
      } else {
        setUser(null);
        setLoading(false);
      }
    }
  );
  
  // Verificar sessão existente
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    if (session?.user) {
      loadUserProfile(session.user); // Sem setTimeout
    } else {
      setLoading(false);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

### 4. Sincronizar Hooks useNFs e useNFsCliente

**Problema:** Mapeamento inconsistente entre cliente e transportadora  

**Correção em `src/lib/nfApi.ts`:**
```typescript
export async function fetchNFsByStatus(status?: NFStatus) {
  // Sempre incluir relacionamento com solicitacoes para consistência
  let query = supabase
    .from("notas_fiscais")
    .select(`
      id, numero_nf, numero_pedido, ordem_compra,
      cliente_id, transportadora_id, fornecedor, produto, 
      quantidade, peso, volume, localizacao,
      data_recebimento, status, status_separacao,
      created_at, updated_at, requested_at, approved_at,
      solicitacoes_carregamento(
        id, status, requested_at, data_agendamento, 
        observacoes, anexos, approved_at
      )
    `)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  
  if (error) throw error;
  
  // MAPEAMENTO CONSISTENTE - igual em ambos os hooks
  return (data || []).map((item: any) => {
    const nf = { ...item };
    const solicitacao = item.solicitacoes_carregamento?.[0];
    
    if (solicitacao) {
      nf.data_agendamento_entrega = solicitacao.data_agendamento;
      nf.observacoes_solicitacao = solicitacao.observacoes;
      nf.documentos_anexos = solicitacao.anexos;
      nf.requested_at = solicitacao.requested_at;
      nf.approved_at = solicitacao.approved_at;
    }
    
    delete nf.solicitacoes_carregamento;
    
    return {
      ...nf,
      status: nf.status as NFStatus,
      status_separacao: nf.status_separacao || 'pendente'
    };
  });
}
```

## 🔧 CORREÇÕES IMPORTANTES (Prioridade 2)

### 5. Padronizar Query Keys

**Arquivo:** `src/hooks/useNFs.ts`  

**Correção:**
```typescript
export function useNFs(status: NFStatus) {
  const { user } = useAuth();
  const scope = user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId;
  
  return useQuery({
    queryKey: ['nfs', status, user?.type, scope], // PADRONIZADO
    queryFn: () => fetchNFsByStatus(status),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id && !!scope, // VALIDAÇÃO DUPLA
  });
}

// Invalidação padronizada
const invalidateAll = () => {
  const scope = user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId;
  const statuses: NFStatus[] = ["ARMAZENADA", "SOLICITADA", "CONFIRMADA"];
  
  statuses.forEach(status => {
    queryClient.invalidateQueries({ 
      queryKey: ['nfs', status, user?.type, scope] // MESMA CHAVE
    });
  });
  
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['solicitacoes', user?.type, scope] });
};
```

### 6. Validação Numérica Robusta

**Arquivo:** `src/components/WMS/FormNotaFiscal.tsx`  

**Correção:**
```typescript
const formSchema = z.object({
  // ... outros campos
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  peso: z.coerce.number().min(0.01, 'Peso deve ser maior que 0'),
  volume: z.coerce.number().min(0, 'Volume deve ser 0 ou maior').default(0),
  localizacao: z.string().min(1, 'Localização é obrigatória').default('A definir')
});

// No onSubmit, validação adicional:
const onSubmit = async (data: FormData) => {
  try {
    // Sanitizar dados numéricos
    const sanitizedData = {
      ...data,
      quantidade: Math.floor(Math.max(1, data.quantidade || 1)),
      peso: Math.max(0.01, Number(data.peso) || 0.01),
      volume: Math.max(0, Number(data.volume) || 0),
      localizacao: (data.localizacao || '').trim() || 'A definir'
    };
    
    // Validação de negócio
    if (sanitizedData.peso > 50000) {
      toast.error('Peso muito alto. Verifique se está em kg.');
      return;
    }
    
    if (sanitizedData.volume > 1000) {
      toast.error('Volume muito alto. Verifique se está em m³.');
      return;
    }
    
    await addNotaFiscal(sanitizedData);
    
  } catch (err) {
    // ... tratamento de erro
  }
};
```

### 7. Resolver Queries N+1 no WMSContext

**Arquivo:** `src/contexts/WMSContext.tsx`  

**Problema atual (linhas 114-127):**
```typescript
// ❌ N+1 Query Problem
for (const nf of transformedNFs) {
  if (nf.clienteId) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('razao_social, cnpj')
      .eq('id', nf.clienteId)
      .single();
  }
}
```

**Correção:**
```typescript
// ✅ Single Query com JOIN
const { data: nfs } = await supabase
  .from('notas_fiscais')
  .select(`
    *,
    clientes!inner(
      id,
      razao_social,
      cnpj
    )
  `)
  .order('created_at', { ascending: false });

if (nfs) {
  const transformedNFs: NotaFiscal[] = nfs.map(nf => ({
    id: nf.id,
    numeroNF: nf.numero_nf,
    // ... outros campos
    cliente: nf.clientes.razao_social, // Já vem do JOIN
    cnpjCliente: nf.clientes.cnpj,     // Já vem do JOIN
    // ... resto dos campos
  }));
  
  setNotasFiscais(transformedNFs);
}
```

## 🔍 VALIDAÇÃO DAS CORREÇÕES

### Checklist de Testes:

**Segurança:**
- [ ] Verificar se search_path foi aplicado nas funções SQL
- [ ] Confirmar proteções de senha habilitadas
- [ ] Testar login/logout sem race conditions

**Dados:**
- [ ] Cliente e transportadora veem mesmos dados da NF
- [ ] Solicitações de carregamento funcionam consistentemente
- [ ] Cache invalidation funciona corretamente

**Performance:**
- [ ] Queries N+1 eliminadas
- [ ] Tempo de carregamento melhorado
- [ ] Memory leaks resolvidos

**UX:**
- [ ] Estados de loading consistentes
- [ ] Tratamento de erro adequado
- [ ] Validações funcionando

### Monitoramento Pós-Correção:

```typescript
// Adicionar em src/utils/logger.ts
export const monitorCriticalPaths = () => {
  // Monitorar auth flows
  audit('AUTH_FLOW_START', 'MONITORING', {});
  
  // Monitorar query performance
  const queryStart = performance.now();
  // ... query
  const queryTime = performance.now() - queryStart;
  if (queryTime > 2000) {
    warn('Slow query detected:', { queryTime });
  }
  
  // Monitorar cache misses
  queryClient.getQueryCache().subscribe(event => {
    if (event.type === 'queryAdded') {
      log('New query added:', event.query.queryKey);
    }
  });
};
```

---

**⚠️ IMPORTANTE:** Executar todas as correções em ambiente de teste antes de aplicar em produção. Fazer backup completo do banco de dados antes das alterações SQL.

**Tempo estimado:** 2-3 dias para implementar todas as correções críticas.

**Responsável:** Desenvolvedor Senior + DevOps para configurações Supabase

**Status:** 🔴 URGENTE - Implementar imediatamente