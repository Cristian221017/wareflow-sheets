import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/auth';
import { log, warn, error as logError } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string, cpf: string, setor: string) => Promise<{ error?: string }>;
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
          
          // Se é refresh de token e já tem usuário carregado, manter usuário atual para evitar mudanças de painel
          if (userRef.current && (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            log('🔄 Token refreshed or initial session with existing user, keeping current profile');
            setLoading(false); // Ensure loading is false to prevent redirects
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
    // Create timeout promise to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Profile loading timeout')), 5000)
    );
    
    try {
      // Race against timeout to prevent infinite loading
      const userData = await Promise.race([
        loadUserDataWithTimeout(supabaseUser),
        timeoutPromise
      ]);
      
      return userData;
    } catch (error) {
      
      // Always return a valid user to prevent infinite loading
      return {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente' as const
      };
    }
  };

  const loadUserDataWithTimeout = async (supabaseUser: SupabaseUser): Promise<User> => {
    // FIRST: Check user_transportadoras for role-based access (super_admin, admin_transportadora, operador)
    // This takes priority to ensure consistent user identity
    const { data: userTranspData, error: userTranspError } = await supabase
      .from('user_transportadoras')
      .select('role, transportadora_id, is_active')
      .eq('user_id', supabaseUser.id)
      .eq('is_active', true)
      .limit(1);

    if (userTranspData?.[0] && !userTranspError) {
      const userTransp = userTranspData[0];
      
      // Get transportadora data if needed
      let transportadoraName = supabaseUser.email?.split('@')[0] || 'Admin';
      if (userTransp.transportadora_id) {
        const { data: transpData } = await supabase
          .from('transportadoras')
          .select('razao_social')
          .eq('id', userTransp.transportadora_id)
          .limit(1);
        
        if (transpData?.[0]) {
          transportadoraName = transpData[0].razao_social;
        }
      }
      
      log('🏢 Loading as transportadora user:', { 
        role: userTransp.role, 
        transportadoraId: userTransp.transportadora_id 
      });
      
      return {
        id: supabaseUser.id,
        name: transportadoraName,
        email: supabaseUser.email || '',
        type: 'transportadora',
        role: userTransp.role as 'super_admin' | 'admin_transportadora' | 'operador',
        transportadoraId: userTransp.transportadora_id
      };
    }

    // SECOND: Check direct transportadora email match (legacy support)
    const { data: transportadoraData } = await supabase
      .from('transportadoras')
      .select('id, razao_social, email')
      .eq('email', supabaseUser.email || '')
      .limit(1);

    if (transportadoraData?.[0]) {
      const transportadora = transportadoraData[0];
      
      return {
        id: supabaseUser.id,
        name: transportadora.razao_social,
        email: transportadora.email,
        type: 'transportadora',
        role: 'admin_transportadora', // Default role for legacy users
        transportadoraId: transportadora.id
      };
    }

    // THIRD: Check direct cliente email match
    const { data: clienteData } = await supabase
      .from('clientes')
      .select('id, razao_social, email, transportadora_id')
      .eq('email', supabaseUser.email || '')
      .limit(1);

    if (clienteData?.[0]) {
      const cliente = clienteData[0];
      
      return {
        id: supabaseUser.id,
        name: cliente.razao_social,
        email: cliente.email,
        type: 'cliente',
        clienteId: cliente.id,
        transportadoraId: cliente.transportadora_id
      };
    }

    // Final fallback
    return {
      id: supabaseUser.id,
      name: supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      type: 'cliente' as const
    };
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

  const signUp = async (email: string, password: string, name: string, cpf: string, setor: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            cpf,
            setor
          },
          emailRedirectTo: `https://vyqnnnyamoovzxmuvtkl.supabase.co/`
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