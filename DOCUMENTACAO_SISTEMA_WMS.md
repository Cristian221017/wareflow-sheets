# DOCUMENTAÇÃO COMPLETA DO SISTEMA WMS

## Visão Geral do Sistema

O **Sistema WMS (Warehouse Management System)** é uma aplicação web completa para gestão de armazéns e transportadoras, desenvolvida com **React + TypeScript**, **Supabase** como backend e **Tailwind CSS** para estilização.

### Stack Tecnológico

```json
{
  "Frontend": {
    "Framework": "React 18.3.1",
    "Language": "TypeScript 5.8.3",
    "Build Tool": "Vite 5.4.19",
    "Router": "React Router DOM 6.30.1",
    "State Management": "React Context + TanStack Query",
    "Styling": "Tailwind CSS 3.4.17 + shadcn/ui",
    "Forms": "React Hook Form + Zod validation",
    "Charts": "Recharts 2.15.4",
    "Notifications": "Sonner"
  },
  "Backend": {
    "Database": "Supabase PostgreSQL",
    "Authentication": "Supabase Auth",
    "Storage": "Supabase Storage", 
    "Real-time": "Supabase Realtime",
    "Edge Functions": "Supabase Functions"
  }
}
```

---

## Arquitetura da Aplicação

### 1. Estrutura de Pastas

```
src/
├── components/           # Componentes reutilizáveis
│   ├── ui/              # Componentes shadcn/ui
│   ├── Auth/            # Componentes de autenticação
│   ├── WMS/             # Componentes específicos do WMS
│   ├── Dashboard/       # Componentes de dashboard
│   ├── Notifications/   # Sistema de notificações
│   └── system/          # Componentes de sistema
├── contexts/            # Contextos React
├── hooks/               # Custom hooks
├── lib/                 # Utilitários e APIs
├── pages/               # Páginas da aplicação
├── types/               # Definições de tipos TypeScript
├── utils/               # Funções utilitárias
├── integrations/        # Integrações (Supabase)
├── config/              # Configurações
└── tests/               # Testes
```

### 2. Fluxo de Inicialização

```typescript
// main.tsx - Ponto de entrada
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// App.tsx - Setup de contextos e rotas
<AuthProvider>
  <WMSProvider>
    <FinanceiroProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Definição de rotas */}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </FinanceiroProvider>
  </WMSProvider>
</AuthProvider>
```

---

## Sistema de Autenticação

### 1. Estrutura de Usuários

```typescript
// src/types/auth.ts
export interface User {
  id: string;
  name: string;
  email: string;
  type: 'transportadora' | 'cliente';
  role?: 'super_admin' | 'admin_transportadora' | 'operador' | 'cliente';
  transportadoraId?: string;
  // Campos específicos para clientes
  cnpj?: string;
  emailNotaFiscal?: string;
  emailSolicitacaoLiberacao?: string;
  emailLiberacaoAutorizada?: string;
}
```

### 2. Fluxo de Autenticação

```typescript
// AuthContext.tsx - Principais funções
const loadUserProfile = async (supabaseUser: SupabaseUser) => {
  // 1. Verificar se é usuário do sistema (admin/transportadora)
  const [profileResult, roleResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', supabaseUser.id),
    supabase.from('user_transportadoras').select('*').eq('user_id', supabaseUser.id)
  ]);

  // 2. Se não for do sistema, verificar se é cliente
  if (!roleResult.data) {
    const clienteData = await supabase
      .from('clientes')
      .select('*')
      .eq('email', supabaseUser.email)
      .eq('status', 'ativo');
  }
};
```

### 3. Tipos de Usuário e Rotas

| Tipo | Role | Rota | Acesso |
|------|------|------|--------|
| Super Admin | `super_admin` | `/admin` | Total |
| Admin Transportadora | `admin_transportadora` | `/transportadora` | Sua transportadora |
| Operador | `operador` | `/transportadora` | Sua transportadora |
| Cliente | - | `/cliente` | Seus dados |

---

## Banco de Dados Supabase

### 1. Principais Tabelas

#### **transportadoras**
```sql
CREATE TABLE public.transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  plano TEXT NOT NULL DEFAULT 'basico',
  limite_usuarios INTEGER DEFAULT 5,
  limite_clientes INTEGER DEFAULT 50,
  data_contrato DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### **clientes**
```sql
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transportadora_id UUID NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  email_nota_fiscal TEXT,
  email_solicitacao_liberacao TEXT,
  email_liberacao_autorizada TEXT,
  email_notificacao_boleto TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **notas_fiscais**
```sql
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nf TEXT NOT NULL,
  numero_pedido TEXT NOT NULL,
  ordem_compra TEXT NOT NULL,
  data_recebimento DATE NOT NULL,
  fornecedor TEXT NOT NULL,
  cnpj_fornecedor TEXT NOT NULL,
  cliente_id UUID NOT NULL,
  transportadora_id UUID NOT NULL,
  produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  peso NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  localizacao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ARMAZENADA',
  requested_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. Row Level Security (RLS)

O sistema utiliza RLS extensivamente para segurança:

```sql
-- Exemplo: Clientes só veem suas próprias notas fiscais
CREATE POLICY "Clientes podem visualizar suas próprias notas fiscais" 
ON public.notas_fiscais 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = notas_fiscais.cliente_id 
    AND c.email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    AND c.status = 'ativo'
  )
);
```

### 3. Funções do Banco

O sistema possui várias funções para operações complexas:

```sql
-- Solicitar carregamento de NF
CREATE FUNCTION public.nf_solicitar(p_nf_id uuid, p_user_id uuid)
RETURNS void

-- Confirmar carregamento
CREATE FUNCTION public.nf_confirmar(p_nf_id uuid, p_user_id uuid) 
RETURNS void

-- Recusar carregamento
CREATE FUNCTION public.nf_recusar(p_nf_id uuid, p_user_id uuid)
RETURNS void
```

---

## Sistema de Estados das Notas Fiscais

### Fluxo de Estados

```
ARMAZENADA → SOLICITADA → CONFIRMADA
     ↑           ↓
     └─────── RECUSADA
```

### Transições Permitidas

| De | Para | Quem | Função |
|----|------|------|--------|
| ARMAZENADA | SOLICITADA | Cliente | `nf_solicitar()` |
| SOLICITADA | CONFIRMADA | Transportadora | `nf_confirmar()` |
| SOLICITADA | ARMAZENADA | Transportadora | `nf_recusar()` |

---

## Contextos React

### 1. AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  clientes: User[];
  addCliente: (cliente: Omit<User, 'id' | 'type'>) => Promise<{ id: string }>;
}
```

### 2. WMSContext

```typescript
interface WMSContextType {
  // Dados
  notasFiscais: NotaFiscal[];
  pedidosLiberacao: PedidoLiberacao[];
  pedidosLiberados: PedidoLiberado[];
  
  // Estados
  isLoading: boolean;
  
  // Ações principais
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<void>;
  solicitarCarregamento: (numeroNF: string) => Promise<void>;
  aprovarCarregamento: (numeroNF: string, transportadora: string) => Promise<void>;
  rejeitarCarregamento: (numeroNF: string, motivo: string) => Promise<void>;
}
```

### 3. FinanceiroContext

```typescript
interface FinanceiroContextType {
  documentos: DocumentoFinanceiro[];
  loading: boolean;
  addDocumentoFinanceiro: (data: DocumentoFinanceiroFormData) => Promise<{ id: string } | null>;
  updateDocumentoFinanceiro: (id: string, data: Partial<DocumentoFinanceiroFormData>) => Promise<void>;
  uploadArquivo: (documentoId: string, fileData: FileUploadData) => Promise<void>;
  downloadArquivo: (documentoId: string, type: 'boleto' | 'cte') => Promise<void>;
}
```

---

## Design System

### 1. Tokens de Design

```css
/* index.css - Sistema de design baseado em HSL */
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  
  /* Cores específicas do WMS */
  --success: 142 76% 36%;
  --warning: 47.9 95.8% 53.1%;
  --error: 0 84.2% 60.2%;
  
  /* Prioridades */
  --priority-high: 0 84.2% 60.2%;
  --priority-medium: 47.9 95.8% 53.1%;
  --priority-low: 142 76% 36%;
}
```

### 2. Componentes shadcn/ui

O sistema utiliza componentes shadcn/ui customizados:

- **Button**: Múltiplas variantes (default, destructive, outline, secondary, ghost, link)
- **Card**: Para displays de informação
- **Dialog**: Para modais
- **Form**: Integrado com react-hook-form
- **Table**: Para listagens
- **Toast**: Para notificações

---

## APIs e Integrações

### 1. API de Notas Fiscais

```typescript
// lib/nfApi.ts
export const solicitarNF = async (nfId: string) => {
  const { error } = await supabase.rpc('nf_solicitar', {
    p_nf_id: nfId,
    p_user_id: (await supabase.auth.getUser()).data.user?.id
  });
  if (error) throw error;
};

export const confirmarNF = async (nfId: string) => {
  const { error } = await supabase.rpc('nf_confirmar', {
    p_nf_id: nfId,
    p_user_id: (await supabase.auth.getUser()).data.user?.id
  });
  if (error) throw error;
};
```

### 2. API Financeira

```typescript
// lib/financeiroApi.ts
export const createDocumentoFinanceiro = async (data: DocumentoFinanceiroFormData) => {
  const { data: doc, error } = await supabase.rpc('financeiro_create_documento', {
    p_cliente_id: data.clienteId,
    p_numero_cte: data.numeroCte,
    p_data_vencimento: data.dataVencimento,
    p_valor: data.valor,
    p_observacoes: data.observacoes
  });
  if (error) throw error;
  return doc;
};
```

---

## Hooks Personalizados

### 1. useNFs - Gerenciamento de Notas Fiscais

```typescript
export function useNFs(status?: NFStatus) {
  return useQuery({
    queryKey: ['nfs', status],
    queryFn: async () => {
      let query = supabase
        .from('notas_fiscais')
        .select(`
          *,
          clientes(razao_social, cnpj)
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 segundos
  });
}
```

### 2. useEnvironment - Detecção de Ambiente

```typescript
export function useEnvironment(): EnvironmentConfig {
  const config = useMemo(() => {
    const hostname = window.location.hostname;
    const isTest = hostname.includes('teste') || 
                   hostname.includes('staging') || 
                   hostname.includes('dev') ||
                   hostname.includes('localhost');

    return {
      env: isTest ? 'test' : 'production',
      isTest,
      isProd: !isTest,
      features: {
        showDebugInfo: isTest,
        enableBetaFeatures: isTest,
        allowTestData: isTest,
        showAdvancedOptions: isTest,
      }
    };
  }, []);

  return config;
}
```

### 3. useFeatureFlags - Feature Flags

```typescript
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const fetchFlags = async () => {
      const { data } = await supabase
        .from('feature_flags')
        .select('key, enabled');
      
      const flagsMap = data?.reduce((acc, flag) => {
        acc[flag.key] = flag.enabled;
        return acc;
      }, {}) || {};
      
      setFlags(flagsMap);
    };

    fetchFlags();
    
    // Realtime subscription
    const channel = supabase
      .channel('feature_flags_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_flags'
      }, fetchFlags)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return { flags, isEnabled: (key: string, defaultValue = false) => flags[key] ?? defaultValue };
}
```

---

## Componentes Principais

### 1. Dashboard Integrado

```typescript
// components/Dashboard/IntegratedDashboard.tsx
export function IntegratedDashboard() {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_current_user_dashboard');
      return data?.[0];
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DashboardCard
        title="NFs Armazenadas"
        value={dashboardData?.nfs_armazenadas || 0}
        icon={Package}
        description="Aguardando solicitação"
      />
      {/* Mais cards... */}
    </div>
  );
}
```

### 2. Fluxo de NFs

```typescript
// components/NfLists/FluxoNFs.tsx
export function FluxoNFs() {
  const { data: armazenadas } = useNFs('ARMAZENADA');
  const { data: solicitadas } = useNFs('SOLICITADA');
  const { data: confirmadas } = useNFs('CONFIRMADA');

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <NFColumn
        title="Armazenadas"
        nfs={armazenadas}
        status="ARMAZENADA"
        color="blue"
      />
      <NFColumn
        title="Solicitadas"
        nfs={solicitadas}
        status="SOLICITADA"
        color="yellow"
      />
      <NFColumn
        title="Confirmadas"
        nfs={confirmadas}
        status="CONFIRMADA"
        color="green"
      />
    </div>
  );
}
```

---

## Sistema de Logs e Auditoria

### 1. System Logs

```sql
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_role TEXT,
  transportadora_id UUID,
  cliente_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  status log_level NOT NULL DEFAULT 'INFO',
  message TEXT,
  meta JSONB DEFAULT '{}',
  correlation_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. Event Log

```sql
CREATE TABLE public.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  correlation_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 3. Função de Log

```sql
CREATE FUNCTION public.log_system_event(
  p_entity_type TEXT,
  p_action TEXT,
  p_status log_level DEFAULT 'INFO',
  p_message TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_transportadora_id UUID DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
) RETURNS system_logs
```

---

## Configuração de Ambiente

### 1. Variáveis de Ambiente

```typescript
// src/config/env.ts
export const ENV = {
  MODE: import.meta.env.MODE,
  APP_ENV: import.meta.env.VITE_ENV ?? 'staging',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL!,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY!,
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'WMS',
};
```

### 2. Cliente Supabase

```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient<Database>(
  ENV.SUPABASE_URL, 
  ENV.SUPABASE_ANON, 
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

---

## Deployment e Segurança

### 1. Safety Checks

O sistema possui verificações de segurança antes de deployments:

```typescript
// Validação de integridade de dados
CREATE FUNCTION public.validate_data_integrity()
RETURNS TABLE(validation_id uuid, status text, issues_found integer, details jsonb)

// Health checks do sistema
CREATE FUNCTION public.run_system_health_check()
RETURNS void

// Backup de segurança
CREATE FUNCTION public.create_safety_backup(p_backup_name text)
RETURNS uuid
```

### 2. Feature Flags

Sistema de feature flags para controle de funcionalidades:

```sql
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  environment TEXT NOT NULL DEFAULT 'all',
  percentage INTEGER DEFAULT 0,
  target_users JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## Testes e Qualidade

### 1. Estrutura de Testes

```typescript
// src/tests/nfFluxo.test.ts
describe('NF Flow Tests', () => {
  test('should transition from ARMAZENADA to SOLICITADA', async () => {
    // Test implementation
  });
  
  test('should transition from SOLICITADA to CONFIRMADA', async () => {
    // Test implementation
  });
});
```

### 2. Auditoria de Cadastros

O sistema possui ferramenta de auditoria para verificar integridade:

```typescript
// src/utils/auditoriaCadastros.ts
export const auditoriaCadastros = {
  async executarAuditoriaCompleta() {
    const resultados = await Promise.all([
      this.verificarIntegridadeProfiles(),
      this.verificarVinculosUserClientes(),
      this.testarAutenticacaoClientes(),
      this.corrigirVinculosFaltantes()
    ]);
    
    return {
      profiles: resultados[0],
      vinculos: resultados[1],
      autenticacao: resultados[2],
      correcoes: resultados[3]
    };
  }
};
```

---

## Próximos Passos e Melhorias

### 1. Funcionalidades Planejadas

- [ ] Sistema de notificações em tempo real
- [ ] Relatórios avançados com filtros
- [ ] Integração com APIs externas (EDI)
- [ ] App mobile para operadores
- [ ] Dashboard executivo para transportadoras

### 2. Otimizações Técnicas

- [ ] Implementar React.lazy para code splitting
- [ ] Adicionar Service Worker para offline
- [ ] Melhorar caching com TanStack Query
- [ ] Implementar testes E2E com Playwright
- [ ] Monitoramento com Sentry ou similar

### 3. Segurança

- [ ] Implementar 2FA para administradores
- [ ] Audit trail completo de todas as ações
- [ ] Criptografia de dados sensíveis
- [ ] Rate limiting nas APIs
- [ ] Compliance com LGPD

---

## Conclusão

O Sistema WMS é uma aplicação robusta e escalável que combina tecnologias modernas com práticas de segurança e auditoria. A arquitetura baseada em contextos React, Supabase RLS e funções do banco garante tanto performance quanto segurança.

A documentação deve ser atualizada conforme novas funcionalidades são implementadas e serve como referência para novos desenvolvedores que se juntarem ao projeto.