// Hook de autenticação seguro e otimizado - substitui AuthContext
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/auth';
import { log, warn, error as logError } from '@/utils/productionLogger';
import { handleError, retryOperation } from '@/utils/centralizedErrorHandler';
import { memoryManager, SecureIdGenerator } from '@/utils/memoryManager';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook seguro de autenticação que substitui AuthContext
 * - Elimina race conditions
 * - Memory management automático
 * - Error handling centralizado
 * - Performance otimizada
 */
export function useSecureAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });

  const operationRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const sessionId = useRef<string>(SecureIdGenerator.generate('session'));

  // Safe state update
  const safeSetState = useCallback((updates: Partial<AuthState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Optimized user data loading
  const loadUserData = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    const operationId = SecureIdGenerator.generate('auth_load');
    
    try {
      return await retryOperation(
        async () => {
          // System user check (admin/transportadora) - batched queries
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

          if (roleResult.data?.role) {
            return {
              id: supabaseUser.id,
              name: profileResult.data?.name || supabaseUser.email || 'Usuário',
              email: profileResult.data?.email || supabaseUser.email || '',
              type: 'transportadora' as const,
              role: roleResult.data.role,
              transportadoraId: roleResult.data.transportadora_id
            };
          }

          // Cliente check
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
              type: 'cliente' as const,
              cnpj: clienteData.cnpj,
              emailNotaFiscal: clienteData.email_nota_fiscal,
              emailSolicitacaoLiberacao: clienteData.email_solicitacao_liberacao,
              emailLiberacaoAutorizada: clienteData.email_liberacao_autorizada,
              clienteId: clienteData.id,
              transportadoraId: clienteData.transportadora_id
            };
          }

          // Fallback user
          warn('🔍 Usuário não vinculado - criando fallback');
          return {
            id: supabaseUser.id,
            name: supabaseUser.email?.split('@')[0] || 'Usuário',
            email: supabaseUser.email || '',
            type: 'cliente' as const,
            role: undefined,
            transportadoraId: undefined
          };
        },
        {
          component: 'SecureAuth',
          action: 'loadUserData',
          userId: supabaseUser.id,
          metadata: { operationId, sessionId: sessionId.current }
        },
        2
      );
    } catch (error) {
      handleError(
        error as Error,
        {
          component: 'SecureAuth',
          action: 'loadUserData',
          userId: supabaseUser.id,
          metadata: { operationId, sessionId: sessionId.current }
        },
        'high'
      );
      return null;
    }
  }, []);

  // Handle auth state changes with concurrency control
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    // Prevent concurrent operations
    if (operationRef.current) {
      log('⏳ Auth operation em andamento, ignorando', { event, sessionId: sessionId.current });
      return;
    }

    const operationPromise = (async () => {
      try {
        log('🔄 Auth state mudou', { event, userId: session?.user?.id, sessionId: sessionId.current });

        if (event === 'SIGNED_OUT' || !session) {
          log('🔄 Usuário deslogado');
          safeSetState({
            user: null,
            session: null,
            loading: false,
            error: null
          });
          return;
        }

        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
          safeSetState({ session, loading: true, error: null });

          // Skip reload for token refresh if user exists
          if (event === 'TOKEN_REFRESHED' && state.user) {
            log('🔄 Token refreshed, mantendo usuário');
            safeSetState({ loading: false });
            return;
          }

          const user = await loadUserData(session.user);
          
          if (user) {
            safeSetState({ user, loading: false, error: null });
            log('✅ Usuário carregado', { userId: user.id, type: user.type, sessionId: sessionId.current });
          } else {
            safeSetState({ 
              loading: false, 
              error: 'Erro ao carregar perfil do usuário' 
            });
          }
        }
      } catch (error) {
        logError('❌ Erro no auth state change', error);
        safeSetState({
          loading: false,
          error: 'Erro de autenticação'
        });
      }
    })();

    operationRef.current = operationPromise;
    await operationPromise;
    operationRef.current = null;
  }, [loadUserData, safeSetState, state.user]);

  // Login method
  const login = useCallback(async (email: string, password: string) => {
    try {
      safeSetState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        handleError(
          error,
          { component: 'SecureAuth', action: 'login', metadata: { email } },
          'medium'
        );
        safeSetState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      return { success: true, user: state.user || undefined };
    } catch (error) {
      const errorMsg = 'Erro interno no login';
      handleError(
        error as Error,
        { component: 'SecureAuth', action: 'login', metadata: { email } },
        'high'
      );
      safeSetState({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, [safeSetState, state.user]);

  // Logout method
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      handleError(
        error as Error,
        { component: 'SecureAuth', action: 'logout' },
        'medium'
      );
    }
  }, []);

  // Setup auth listener
  useEffect(() => {
    log('🚀 SecureAuth initialized', { sessionId: sessionId.current });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAuthStateChange('INITIAL_SESSION', session);
      } else {
        safeSetState({ loading: false });
      }
    });

    // Cleanup with memory manager
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
        return loadUserData(state.session.user);
      }
      return Promise.resolve(null);
    },
    clearError: () => safeSetState({ error: null }),
    // Debug info
    sessionId: sessionId.current
  };
}