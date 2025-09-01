# 🛠️ GUIA TÉCNICO DE CORREÇÕES - EXEMPLOS PRÁTICOS

## 1. SISTEMA DE LOGS CONDICIONAIS

### ❌ ANTES (Problema)
```typescript
console.log('🔄 Invalidando TODAS as queries');
console.error('❌ Erro ao buscar logs:', queryError);
```

### ✅ DEPOIS (Solução)
```typescript
// src/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export const errorLog = (...args: any[]) => {
  if (isDevelopment) {
    console.error(...args);
  }
  // Sempre enviar para serviço de monitoramento
  // Sentry.captureException(args[0]);
};

// USO:
debugLog('🔄 Invalidando TODAS as queries');
errorLog('❌ Erro ao buscar logs:', queryError);
```

## 2. OTIMIZAÇÃO DE TIMEOUTS NO AUTHCONTEXT

### ❌ ANTES (Problema)
```typescript
const userData = await Promise.race([
  getUserData(supabaseUser),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('LoadUserProfile timeout after 15s')), 15000)
  )
]);
```

### ✅ DEPOIS (Solução)
```typescript
// Função utilitária para timeout com retry
const withRetry = async <T>(
  fn: () => Promise<T>, 
  maxRetries = 2, 
  timeout = 3000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout após ${timeout}ms (tentativa ${attempt})`)), timeout)
        )
      ]);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff
    }
  }
  throw new Error('Max retries reached');
};

// USO:
const userData = await withRetry(() => getUserData(supabaseUser), 2, 3000);
```

## 3. CACHE DE AUTENTICAÇÃO

### ❌ ANTES (Problema)
```typescript
async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser(); // Chamada toda vez
  if (error || !data.user?.id) {
    throw new Error('Usuário não autenticado');
  }
  return data.user.id;
}
```

### ✅ DEPOIS (Solução)
```typescript
// src/utils/authCache.ts
class AuthCache {
  private userCache: { id: string; expiry: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  async getCurrentUserId(): Promise<string> {
    // Verificar cache válido
    if (this.userCache && Date.now() < this.userCache.expiry) {
      return this.userCache.id;
    }

    // Buscar dados frescos
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) {
      throw new Error('Usuário não autenticado');
    }

    // Atualizar cache
    this.userCache = {
      id: data.user.id,
      expiry: Date.now() + this.CACHE_TTL
    };

    return data.user.id;
  }

  clearCache() {
    this.userCache = null;
  }
}

export const authCache = new AuthCache();
```

## 4. CLEANUP DE SUBSCRIPTIONS REALTIME

### ❌ ANTES (Problema)
```typescript
let activeCentralChannel: RealtimeChannel | null = null;

export function subscribeCentralizedChanges(queryClient: QueryClient): () => void {
  if (activeCentralChannel) {
    return () => {}; // Cleanup vazio - problema!
  }
  // ...
}
```

### ✅ DEPOIS (Solução)
```typescript
// src/lib/realtimeCentralized.ts
class RealtimeManager {
  private activeChannel: RealtimeChannel | null = null;
  private subscribers = new Set<string>();

  subscribe(id: string, queryClient: QueryClient): () => void {
    this.subscribers.add(id);

    // Criar channel apenas se não existir
    if (!this.activeChannel) {
      this.createChannel(queryClient);
    }

    // Retorna cleanup específico
    return () => {
      this.subscribers.delete(id);
      
      // Se não há mais subscribers, limpar channel
      if (this.subscribers.size === 0) {
        this.cleanup();
      }
    };
  }

  private createChannel(queryClient: QueryClient) {
    this.activeChannel = supabase
      .channel('wms-central-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_fiscais' }, 
          (payload) => this.handleNFChange(payload, queryClient))
      .subscribe();
  }

  private cleanup() {
    if (this.activeChannel) {
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
  }
}

export const realtimeManager = new RealtimeManager();
```

## 5. ERROR BOUNDARIES

### ✅ IMPLEMENTAÇÃO
```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log para serviço de monitoramento
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-red-50">
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Algo deu errado</h1>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Recarregar Página
      </button>
    </div>
  </div>
);
```

## 6. OTIMIZAÇÃO DE useState

### ❌ ANTES (Problema)
```typescript
const [selectedIds, setSelectedIds] = useState<string[]>([]); // Novo array toda vez
```

### ✅ DEPOIS (Solução)
```typescript
import { useMemo, useCallback } from 'react';

// Para arrays/objects vazios
const EMPTY_ARRAY: string[] = [];
const [selectedIds, setSelectedIds] = useState<string[]>(EMPTY_ARRAY);

// Para inicialização complexa
const initialState = useMemo(() => ({
  items: [],
  loading: false,
  error: null
}), []);

const [state, setState] = useState(initialState);

// Para handlers otimizados
const handleSelect = useCallback((id: string) => {
  setSelectedIds(prev => 
    prev.includes(id) 
      ? prev.filter(item => item !== id)
      : [...prev, id]
  );
}, []);
```

## 7. REMOÇÃO DE SENHAS HARDCODED

### ❌ ANTES (Problema)
```typescript
quickFillData: {
  transportadora: {
    email: 'admin@rodiviario.com.br',
    password: 'trans123', // PERIGO!
  }
}
```

### ✅ DEPOIS (Solução)
```typescript
// .env.development (apenas)
VITE_DEV_ADMIN_EMAIL=admin@rodiviario.com.br
VITE_DEV_ADMIN_PASSWORD=trans123

// LoginPage.tsx
const isDevelopment = process.env.NODE_ENV === 'development';

const quickFillData = isDevelopment ? {
  transportadora: {
    email: import.meta.env.VITE_DEV_ADMIN_EMAIL || '',
    password: import.meta.env.VITE_DEV_ADMIN_PASSWORD || '',
  }
} : null;

// Só mostrar botões em dev
{isDevelopment && quickFillData && (
  <Button onClick={() => fillQuickData('transportadora')}>
    Quick Fill Admin
  </Button>
)}
```

---
## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Sistema de logs condicionais
- [ ] Timeout com retry no AuthContext  
- [ ] Cache de autenticação
- [ ] Cleanup robusto de subscriptions
- [ ] Error Boundaries em routes principais
- [ ] Otimização de useState
- [ ] Remoção de senhas hardcoded
- [ ] Sanitização de dangerouslySetInnerHTML
- [ ] Testes unitários para correções
- [ ] Monitoramento de performance

*Implementar na ordem de prioridade para máximo impacto*