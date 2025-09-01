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

  // Optimized user data loading using RPC function
  const loadUserData = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    const operationId = SecureIdGenerator.generate('auth_load');
    
    try {
      console.log(`🔍 [SecureAuth] Loading user profile for: ${supabaseUser.id}`);
      console.log(`🔍 [SecureAuth] Email: ${supabaseUser.email}`);
      
      // Use the optimized RPC function instead of multiple queries
      const { data: result, error } = await supabase
        .rpc('get_user_data_optimized' as any, {
          p_user_id: supabaseUser.id,
          p_email: supabaseUser.email || ''
        });
      
      if (error) {
        console.error('❌ [SecureAuth] RPC error:', error);
        throw error;
      }
      
      console.log('🔍 [SecureAuth] RPC result:', result);
      
      if (!result || !Array.isArray(result) || result.length === 0) {
        console.log('🔍 [SecureAuth] No data returned, using fallback');
        const fallbackUser: User = {
          id: supabaseUser.id,
          name: supabaseUser.email?.split('@')[0] || 'Usuário',
          email: supabaseUser.email || '',
          type: 'cliente'
        };
        console.log('🔍 [SecureAuth] Fallback user created:', fallbackUser);
        return fallbackUser;
      }
      
      const userData = result[0].user_data;
      console.log('🔍 [SecureAuth] User data parsed:', userData);
      
      return userData as User;
      
    } catch (error) {
      console.error('❌ [SecureAuth] Failed to load user profile:', error);
      logError('Error loading user data via RPC:', error);
      
      // Return fallback user on error
      const fallbackUser: User = {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente'
      };
      
      warn('Using fallback user data:', { fallbackUser });
      return fallbackUser;
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