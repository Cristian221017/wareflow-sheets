import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/auth';
import { log, warn, error as logError } from '@/utils/logger';
import { securityMonitor } from '@/utils/securityMonitor';

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
  
  // Session timeout management
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Sync refs with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Session timeout management
  const resetSessionTimeout = () => {
    lastActivityRef.current = Date.now();
    
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    if (user) {
      sessionTimeoutRef.current = setTimeout(() => {
        warn('🕐 Session timeout - logging out user');
        logout();
      }, SESSION_TIMEOUT);
    }
  };

  // Activity monitoring
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => resetSessionTimeout();
    
    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });
    
    // Initial timeout setup
    resetSessionTimeout();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
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
          
          // Se é refresh de token ou sessão inicial e já tem usuário carregado, manter usuário atual
          // Isso previne mudanças de perfil que causam redirecionamentos automáticos
          if (userRef.current && (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            log('🔄 Token refreshed or initial session with existing user, keeping current profile to prevent portal switching');
            setLoading(false);
            return;
          }
          
          // Apenas carregar perfil em login inicial para evitar mudanças de portal
          if (event === 'SIGNED_IN' && !userRef.current) {
            await loadUserProfile(session.user);
          }
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
    // Cache key to ensure consistent user identity and prevent portal switching
    const cacheKey = `user_profile_${supabaseUser.id}`;
    const cachedUser = sessionStorage.getItem(cacheKey);
    
    if (cachedUser) {
      log('📋 Using cached user profile to prevent portal switching');
      return JSON.parse(cachedUser);
    }
    
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
      
      const transportadoraUser = {
        id: supabaseUser.id,
        name: transportadoraName,
        email: supabaseUser.email || '',
        type: 'transportadora' as const,
        role: userTransp.role as 'super_admin' | 'admin_transportadora' | 'operador',
        transportadoraId: userTransp.transportadora_id
      };
      
      // Cache user profile to prevent inconsistent loading
      sessionStorage.setItem(cacheKey, JSON.stringify(transportadoraUser));
      return transportadoraUser;
    }

    // SECOND: Check direct transportadora email match (legacy support)
    const { data: transportadoraData } = await supabase
      .from('transportadoras')
      .select('id, razao_social, email')
      .eq('email', supabaseUser.email || '')
      .limit(1);

    if (transportadoraData?.[0]) {
      const transportadora = transportadoraData[0];
      
      const legacyTransportadoraUser = {
        id: supabaseUser.id,
        name: transportadora.razao_social,
        email: transportadora.email,
        type: 'transportadora' as const,
        role: 'admin_transportadora' as const, // Default role for legacy users
        transportadoraId: transportadora.id
      };
      
      // Cache user profile to prevent inconsistent loading
      sessionStorage.setItem(cacheKey, JSON.stringify(legacyTransportadoraUser));
      return legacyTransportadoraUser;
    }

    // THIRD: Check direct cliente email match
    const { data: clienteData } = await supabase
      .from('clientes')
      .select('id, razao_social, email, transportadora_id')
      .eq('email', supabaseUser.email || '')
      .limit(1);

    if (clienteData?.[0]) {
      const cliente = clienteData[0];
      
      const clienteUser = {
        id: supabaseUser.id,
        name: cliente.razao_social,
        email: cliente.email,
        type: 'cliente' as const,
        clienteId: cliente.id,
        transportadoraId: cliente.transportadora_id
      };
      
      // Cache user profile to prevent inconsistent loading
      sessionStorage.setItem(cacheKey, JSON.stringify(clienteUser));
      return clienteUser;
    }

    // Final fallback
    const fallbackUser = {
      id: supabaseUser.id,
      name: supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      type: 'cliente' as const
    };
    
    // Cache fallback user profile
    sessionStorage.setItem(cacheKey, JSON.stringify(fallbackUser));
    return fallbackUser;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Check if account is locked
      const lockStatus = securityMonitor.isAccountLocked(email);
      if (lockStatus) {
        const remainingTime = Math.ceil(securityMonitor.getRemainingLockoutTime(email) / 1000);
        warn(`Login blocked - account locked for ${remainingTime} seconds`);
        return false;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logError('Login error:', error);
        // Record failed login attempt
        await securityMonitor.recordFailedLogin(email);
        return false;
      }

      // Reset session timeout on successful login
      resetSessionTimeout();
      
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
      // Clear session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      
      // Clear cached user profile on logout to allow fresh login
      const userId = user?.id;
      if (userId) {
        sessionStorage.removeItem(`user_profile_${userId}`);
      }
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
        status: 'ativo',
        email_nota_fiscal: clienteData.emailNotaFiscal || null,
        email_solicitacao_liberacao: clienteData.emailSolicitacaoLiberacao || null,
        email_liberacao_autorizada: clienteData.emailLiberacaoAutorizada || null,
        email_notificacao_boleto: clienteData.emailNotificacaoBoleto || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Enviar email de boas-vindas ao cliente
    try {
      const { notificationService } = await import('@/utils/notificationService');
      await notificationService.enviarNotificacaoClienteCadastrado(
        clienteData.email,
        clienteData.name,
        clienteData.senha
      );
    } catch (emailError) {
      console.warn('⚠️ Erro ao enviar email de boas-vindas:', emailError);
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