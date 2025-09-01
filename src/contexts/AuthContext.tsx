import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/auth';
import { log, warn, error as logError, audit, auditError } from '@/utils/logger';
import { withAuthRetry, withTimeout } from '@/utils/withRetry';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  clientes: User[];
  addCliente: (cliente: Omit<User, 'id' | 'type'>) => Promise<{ id: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<User[]>([]);
  
  // References to avoid stale closures
  const userRef = useRef<User | null>(null);
  const loadingRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    log('🚀 AuthProvider initialized');
    log('Initializing auth state...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log('🔄 Auth state changed:', event, session?.user?.id, 'hasCurrentUser:', !!userRef.current);
        
        // Prevent concurrent loading
        if (loadingRef.current && event !== 'SIGNED_OUT') {
          log('⏳ Loading already in progress, skipping...');
          return;
        }

        if (event === 'SIGNED_OUT' || !session) {
          log('🔄 No session, clearing user state');
          userRef.current = null;
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setSession(session);
          
          // Se já existe usuário e não é primeiro carregamento, evitar reload desnecessário
          if (userRef.current && event === 'TOKEN_REFRESHED') {
            log('🔄 Token refreshed, keeping current user');
            return;
          }
          
          await loadUserProfile(session.user);
        }
      }
    );

    // Initial session check - for page refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        log('Initial session check:', session.user.id);
        setSession(session);
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    // Prevent concurrent loading
    if (loadingRef.current) {
      log('⏳ User profile loading already in progress');
      return;
    }
    
    loadingRef.current = true;
    
    try {
      // Mostrar loading apenas no primeiro carregamento
      const currentUser = userRef.current;
      const isRevalidation = !!currentUser;
      
      // Se não é revalidação, mostrar loading
      if (!isRevalidation) {
        setLoading(true);
      }
      
      log('Loading user profile for:', supabaseUser.id, 'isRevalidation:', isRevalidation);
      
      // Timeout otimizado com retry - máximo 3 segundos por tentativa
      const userData = await withAuthRetry(() => getUserData(supabaseUser));
      
      log('User profile loaded successfully:', userData);
      audit('LOGIN_SUCCESS', 'AUTH', { userId: supabaseUser.id, userEmail: userData.email });
      
      userRef.current = userData;
      setUser(userData);
      
      // SEMPRE definir loading como false após sucesso
      setLoading(false);

    } catch (error) {
      logError('Error loading user profile:', error);
      audit('LOGIN_FAILURE', 'AUTH', { userId: supabaseUser.id, error: String(error) });
      
      // Create fallback user data
      const fallbackUser: User = {
        id: supabaseUser.id,
        name: supabaseUser.email || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente',
        role: undefined,
        transportadoraId: undefined
      };
      
      warn('Using fallback user data:', { fallbackUser });
      userRef.current = fallbackUser;
      setUser(fallbackUser);
      setLoading(false);
    } finally {
      loadingRef.current = false;
    }
  };

  const getUserData = async (supabaseUser: SupabaseUser): Promise<User> => {
    log('🔍 Starting getUserData for:', supabaseUser.email);
    
    // First check system user (admin/transportadora roles) with individual timeouts
    try {
      log('🔍 Checking system user tables...');
      
      // Execute queries as promises for withTimeout
      const systemUserQuery = async () => {
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();
        
        const rolePromise = supabase
          .from('user_transportadoras')
          .select('role, is_active, transportadora_id')
          .eq('user_id', supabaseUser.id)
          .eq('is_active', true)
          .maybeSingle();

        return Promise.all([profilePromise, rolePromise]);
      };

      const [profileResult, roleResult] = await withTimeout(
        systemUserQuery(),
        5000,
        'System user queries timeout após 5s'
      );

      const profile = profileResult.data;
      const userRole = roleResult.data;

      log('🔍 Profile result:', profile);
      log('🔍 Role result:', userRole);

      // If user has a system role (admin/transportadora)
      if (userRole && userRole.role) {
        const userData: User = {
          id: supabaseUser.id,
          name: profile?.name || supabaseUser.email || 'Usuário',
          email: profile?.email || supabaseUser.email || '',
          type: 'transportadora', // Always transportadora for system users
          role: userRole.role,
          transportadoraId: userRole.transportadora_id
        };

        log('🔍 System user detected:', userData);
        return userData;
      }
    } catch (error) {
      logError('Error checking system user:', error);
    }

    // Check if user is linked as cliente with timeout
    try {
      log('🔍 Checking cliente table via email...');
      
      const clienteQuery = async () => {
        return supabase
          .from('clientes')
          .select('*')
          .eq('email', supabaseUser.email)
          .eq('status', 'ativo')
          .maybeSingle();
      };

      const clienteResult = await withTimeout(
        clienteQuery(),
        3000,
        'Cliente query timeout após 3s'
      );

      const { data: clienteData, error: clienteError } = clienteResult;

      log('🔍 Cliente data via email query:', clienteData);

      if (clienteData && !clienteError) {
        const userData: User = {
          id: supabaseUser.id, // SEMPRE Auth UID
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

        log('🔍 Cliente user detected:', userData);
        return userData;
      }
    } catch (error) {
      logError('Error checking cliente table:', error);
    }

    // Fallback - user authenticated but not linked to any table
    warn('🔍 User authenticated but not linked to any table - creating fallback user');
    
    const fallbackUser: User = {
      id: supabaseUser.id,
      name: supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      type: 'cliente',
      role: undefined,
      transportadoraId: undefined
    };

    log('🔍 Fallback user created:', fallbackUser);
    return fallbackUser;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logError('Login error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      logError('Login exception:', error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro interno. Tente novamente.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logError('Logout error:', error);
    }
  };

  const addCliente = async (clienteData: Omit<User, 'id' | 'type'>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        razao_social: clienteData.name,
        email: clienteData.email,
        cnpj: clienteData.cnpj || '',
        transportadora_id: clienteData.transportadoraId || '',
        status: 'ativo'
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { id: data.id };
  };

  const value: AuthContextType = {
    user,
    login,
    signUp,
    logout,
    isAuthenticated: !!user,
    loading,
    clientes,
    addCliente,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { useAuth as default };