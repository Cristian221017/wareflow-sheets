// Hook de autenticação otimizado com melhor error handling e performance
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/auth';
import { log, warn, error as logError } from '@/utils/productionLogger';
import { handleError, retryOperation } from '@/utils/centralizedErrorHandler';
import { authCache } from '@/utils/authCache';
import { memoryManager, SecureIdGenerator } from '@/utils/memoryManager';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthOperationResult {
  success: boolean;
  error?: string;
  user?: User;
}

export function useOptimizedAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });

  // Prevent multiple concurrent operations
  const operationRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  // Safe state update que só executa se componente está montado
  const safeSetState = useCallback((updates: Partial<AuthState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Optimized user profile loading com retry
  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    const operationId = SecureIdGenerator.generate('auth_load');
    
    try {
      return await retryOperation(
        async () => {
          // Tentar cache primeiro
          if (authCache.isCacheValid()) {
            const cachedUser = await authCache.getCurrentUser();
            log('🔄 Usando dados do cache de auth', { userId: cachedUser.id });
            
            // Converter para User format
            return await getUserDataFromCache(supabaseUser, cachedUser);
          }

          // Buscar dados frescos
          return await getUserDataFromSupabase(supabaseUser);
        },
        {
          component: 'OptimizedAuth',
          action: 'loadUserProfile',
          userId: supabaseUser.id,
          metadata: { operationId }
        },
        2 // max 2 retries
      );
    } catch (error) {
      handleError(
        error as Error,
        {
          component: 'OptimizedAuth',
          action: 'loadUserProfile',
          userId: supabaseUser.id,
          metadata: { operationId }
        },
        'high'
      );
      return null;
    }
  }, []);

  // Get user data from Supabase with timeout
  const getUserDataFromSupabase = useCallback(async (supabaseUser: SupabaseUser): Promise<User> => {
    log('🔍 Buscando dados do usuário no Supabase', { userId: supabaseUser.id });
    
    // Check system user first (admin/transportadora)
    const [profileResult, roleResult] = await Promise.all([
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
        .maybeSingle()
    ]);

    const profile = profileResult.data;
    const userRole = roleResult.data;

    // System user (admin/transportadora)
    if (userRole?.role) {
      return {
        id: supabaseUser.id,
        name: profile?.name || supabaseUser.email || 'Usuário',
        email: profile?.email || supabaseUser.email || '',
        type: 'transportadora',
        role: userRole.role,
        transportadoraId: userRole.transportadora_id
      };
    }

    // Check cliente by email
    const { data: clienteData } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', supabaseUser.email)
      .eq('status', 'ativo')
      .maybeSingle();

    if (clienteData) {
      return {
        id: supabaseUser.id,
        name: clienteData.razao_social,
        email: clienteData.email,
        type: 'cliente',
        cnpj: clienteData.cnpj,
        emailNotaFiscal: clienteData.email_nota_fiscal,
        emailSolicitacaoLiberacao: clienteData.email_solicitacao_liberacao,
        emailLiberacaoAutorizada: clienteData.email_liberacao_autorizada,
        clienteId: clienteData.id,
        transportadoraId: clienteData.transportadora_id
      };
    }

    // Fallback user
    warn('🔍 Usuário não vinculado a nenhuma tabela - criando fallback');
    return {
      id: supabaseUser.id,
      name: supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      type: 'cliente',
      role: undefined,
      transportadoraId: undefined
    };
  }, []);

  // Convert cached data to User format
  const getUserDataFromCache = useCallback(async (
    supabaseUser: SupabaseUser, 
    cachedUser: { id: string; email: string }
  ): Promise<User> => {
    // Esta é uma versão simplificada que usa dados do cache
    // Em uma implementação completa, você poderia manter mais dados no cache
    return {
      id: supabaseUser.id,
      name: cachedUser.email.split('@')[0],
      email: cachedUser.email,
      type: 'cliente', // Default assumindo cliente
      role: undefined,
      transportadoraId: undefined
    };
  }, []);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    // Evitar operações concorrentes
    if (operationRef.current) {
      log('⏳ Operação de auth já em andamento, ignorando');
      return;
    }

    const operationPromise = (async () => {
      try {
        log('🔄 Auth state mudou:', { event, userId: session?.user?.id });

        if (event === 'SIGNED_OUT' || !session) {
          log('🔄 Usuário deslogado, limpando estado');
          authCache.clearCache();
          safeSetState({
            user: null,
            session: null,
            loading: false,
            error: null
          });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          safeSetState({ session, loading: true, error: null });

          // Skip reload for token refresh if user already exists
          if (event === 'TOKEN_REFRESHED' && state.user) {
            log('🔄 Token refreshed, mantendo usuário atual');
            safeSetState({ loading: false });
            return;
          }

          const user = await loadUserProfile(session.user);
          
          if (user) {
            safeSetState({ user, loading: false, error: null });
            log('✅ Usuário carregado com sucesso', { userId: user.id, type: user.type });
          } else {
            safeSetState({ 
              loading: false, 
              error: 'Erro ao carregar perfil do usuário' 
            });
          }
        }
      } catch (error) {
        logError('❌ Erro no handleAuthStateChange:', error);
        safeSetState({
          loading: false,
          error: 'Erro de autenticação'
        });
      }
    })();

    operationRef.current = operationPromise;
    await operationPromise;
    operationRef.current = null;
  }, [loadUserProfile, safeSetState, state.user]);

  // Login otimizado
  const login = useCallback(async (email: string, password: string): Promise<AuthOperationResult> => {
    try {
      safeSetState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        handleError(
          error,
          { component: 'OptimizedAuth', action: 'login', metadata: { email } },
          'medium'
        );
        safeSetState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // O handleAuthStateChange será chamado automaticamente
      return { success: true, user: state.user || undefined };
    } catch (error) {
      const errorMsg = 'Erro interno no login';
      handleError(
        error as Error,
        { component: 'OptimizedAuth', action: 'login', metadata: { email } },
        'high'
      );
      safeSetState({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, [safeSetState, state.user]);

  // Logout otimizado
  const logout = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      authCache.clearCache();
    } catch (error) {
      handleError(
        error as Error,
        { component: 'OptimizedAuth', action: 'logout' },
        'medium'
      );
    }
  }, []);

  // Setup auth listener
  useEffect(() => {
    log('🚀 OptimizedAuth initialized');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAuthStateChange('INITIAL_SESSION', session);
      } else {
        safeSetState({ loading: false });
      }
    });

    // Cleanup com memory manager
    const cleanup = memoryManager.addSubscription(() => {
      subscription.unsubscribe();
    });

    return cleanup;
  }, [handleAuthStateChange, safeSetState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    login,
    logout,
    // Utility methods
    refreshUser: () => {
      if (state.session) {
        return loadUserProfile(state.session.user);
      }
      return Promise.resolve(null);
    },
    clearError: () => safeSetState({ error: null })
  };
}