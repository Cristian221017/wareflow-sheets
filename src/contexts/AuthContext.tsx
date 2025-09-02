import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/auth';
import { log, warn, error as logError } from '@/utils/logger';

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
    setLoading(true); // SEMPRE mostrar loading durante carregamento
    
    try {
      log('Loading user profile for:', supabaseUser.id);
      
      // Load user data
      const userData = await getUserData(supabaseUser);
      
      log('✅ User profile loaded successfully:', userData);
      
      userRef.current = userData;
      setUser(userData);

    } catch (error) {
      logError('❌ Error loading user profile:', error);
      
      // Create fallback user data
      const fallbackUser: User = {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente'
      };
      
      warn('Using fallback user data:', { fallbackUser });
      userRef.current = fallbackUser;
      setUser(fallbackUser);
    } finally {
      // GARANTIR que loading sempre seja false
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const getUserData = async (supabaseUser: SupabaseUser): Promise<User> => {
    console.log(`🔍 [DETAILED] Loading user profile for: ${supabaseUser.id}`);
    console.log(`🔍 [DETAILED] Email: ${supabaseUser.email}`);
    
    try {
      // Step 1: Check profiles table first
      console.log('🔍 [STEP 1] Checking profiles table...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();
        
      console.log('🔍 [STEP 1] Profile result:', { profileData, profileError });

      // Step 2: Check direct transportadora by email (no joins)
      console.log('🔍 [STEP 2] Checking transportadoras by email...');
      const { data: transportadoraData, error: transportadoraError } = await supabase
        .from('transportadoras')
        .select('id, razao_social, email')
        .eq('email', supabaseUser.email || '');
        
      console.log('🔍 [STEP 2] Transportadora by email result:', { transportadoraData, transportadoraError });

      if (transportadoraData && transportadoraData.length > 0) {
        const transportadora = transportadoraData[0];
        console.log('✅ [STEP 2] Found transportadora by email:', transportadora);
        
        return {
          id: supabaseUser.id,
          name: transportadora.razao_social,
          email: transportadora.email,
          type: 'transportadora',
          role: 'admin_transportadora',
          transportadoraId: transportadora.id
        };
      }

      // Step 3: Check direct cliente by email (no joins)
      console.log('🔍 [STEP 3] Checking clientes by email...');
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id, razao_social, email, transportadora_id')
        .eq('email', supabaseUser.email || '');
        
      console.log('🔍 [STEP 3] Cliente by email result:', { clienteData, clienteError });

      if (clienteData && clienteData.length > 0) {
        const cliente = clienteData[0];
        console.log('✅ [STEP 3] Found cliente by email:', cliente);
        
        return {
          id: supabaseUser.id,
          name: cliente.razao_social,
          email: cliente.email,
          type: 'cliente',
          clienteId: cliente.id,
          transportadoraId: cliente.transportadora_id
        };
      }

      // Step 4: Fallback - create basic user
      console.log('⚠️ [STEP 4] No matches found, creating fallback user');
      const fallbackUser = {
        id: supabaseUser.id,
        name: profileData?.name || supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente' as const
      };
      
      console.log('⚠️ [STEP 4] Fallback user created:', fallbackUser);
      return fallbackUser;

    } catch (error) {
      console.error('❌ [ERROR] Failed to load user profile:', error);
      logError('Complete user profile loading failed:', error);
      
      // Retorna usuário básico em caso de erro
      const errorFallback = {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente' as const
      };
      
      console.log('❌ [ERROR] Error fallback user:', errorFallback);
      return errorFallback;
    }
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