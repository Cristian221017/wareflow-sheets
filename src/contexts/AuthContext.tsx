import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clientPasswordManager } from '@/utils/clientPasswordManager';
import { User, AuthContextType } from '@/types/auth';
import { log, warn, error as logError, audit, auditError } from '@/utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<User[]>([]);
  
  // Ref para evitar problemas de closure no onAuthStateChange
  const userRef = useRef<User | null>(null);
  const loadingRef = useRef(false);
  
  // Sincronizar ref com state
  useEffect(() => {
    log('🚀 AuthProvider initialized');
    
    // Detectar quando usuário retorna de navegação externa
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        log('👁️ App tornou-se visível - usuário retornou de navegação externa');
      }
    };
    
    const handleFocus = () => {
      log('🔍 Window focus - usuário retornou para a aplicação');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sincronizar ref com state  
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    log('Initializing auth state...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log('🔄 Auth state changed:', event, session?.user?.id, 'hasCurrentUser:', !!userRef.current);
        setSession(session);
        
        if (session?.user) {
          // Evitar múltiplas execuções simultâneas
          if (!loadingRef.current) {
            await loadUserProfile(session.user);
          } else {
            log('🔄 LoadUserProfile já em execução, ignorando evento:', event);
          }
        } else {
          log('🔄 No session, clearing user state');
          userRef.current = null;
          setUser(null);
          loadingRef.current = false;
          setLoading(false);
        }
      }
    );

    // Check for existing session (apenas uma vez)
    supabase.auth.getSession().then(({ data: { session } }) => {
      log('Initial session check:', session?.user?.id);
      
      if (session?.user && !loadingRef.current && !userRef.current) {
        loadUserProfile(session.user);
      } else if (!session) {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Sem dependências para evitar loops

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    // Evitar execuções simultâneas
    if (loadingRef.current) {
      log('🔄 LoadUserProfile já em execução, ignorando...');
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
      
      // Add timeout to prevent infinite loading - 15 second max
      const userData = await Promise.race([
        getUserData(supabaseUser),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('LoadUserProfile timeout after 15s')), 15000)
        )
      ]);
      
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
      
      // Profile query with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();
      
      // Role query with timeout  
      const rolePromise = supabase
        .from('user_transportadoras')
        .select('role, is_active, transportadora_id')
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)
        .maybeSingle();

      const [profileResult, roleResult] = await Promise.race([
        Promise.all([profilePromise, rolePromise]),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('System user queries timeout')), 8000)
        )
      ]);

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
      
      const clientePromise = supabase
        .from('clientes')
        .select('*')
        .eq('email', supabaseUser.email)
        .eq('status', 'ativo')
        .maybeSingle();

      const { data: clienteData, error: clienteError } = await Promise.race([
        clientePromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Cliente query timeout')), 8000)
        )
      ]);

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
          transportadoraId: clienteData.transportadora_id,
          clienteId: clienteData.id // ID de domínio do cliente
        };

        log('🔍 Cliente user detected:', userData);
        return userData;
      }
    } catch (error) {
      logError('Error checking cliente:', error);
    }

    // Fallback for orphaned users - create basic user with limited access
    warn('🔍 User authenticated but not linked to any table - creating fallback user');
    auditError('USER_NOT_LINKED', 'AUTH', new Error('User authenticated but no table links found'), {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      authCreatedAt: supabaseUser.created_at
    });

    const fallbackUser: User = {
      id: supabaseUser.id,
      name: supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      type: 'cliente', // Default to cliente
      role: undefined,
      transportadoraId: undefined
    };

    log('🔍 Fallback user created:', fallbackUser);
    return fallbackUser;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logError('Login error:', error);
        audit('LOGIN_FAILURE', 'AUTH', { email, error: error.message });
        setLoading(false);
        return false;
      }

      audit('LOGIN_SUCCESS', 'AUTH', { email });
      return true;
    } catch (err) {
      logError('Login error:', err);
      audit('LOGIN_FAILURE', 'AUTH', { email, error: String(err) });
      setLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    try {
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro inesperado ao criar conta' };
    }
  };

  const logout = async () => {
    setLoading(true);
    audit('LOGOUT', 'AUTH', { userId: user?.id, userEmail: user?.email });
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const addCliente = async (clienteData: Omit<User, 'id' | 'type'>): Promise<{ id: string }> => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      // 1. Inserir cliente na tabela clientes
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          transportadora_id: user.transportadoraId,
          razao_social: clienteData.name,
          cnpj: clienteData.cnpj || '',
          email: clienteData.email,
          email_nota_fiscal: clienteData.emailNotaFiscal,
          email_solicitacao_liberacao: clienteData.emailSolicitacaoLiberacao,
          email_liberacao_autorizada: clienteData.emailLiberacaoAutorizada,
          email_notificacao_boleto: clienteData.emailNotificacaoBoleto,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 2. Se uma senha foi fornecida, criar conta de usuário
      if (clienteData.senha) {
        try {
          log(`🔧 Criando autenticação para novo cliente: ${clienteData.email}`);
          const authResult = await clientPasswordManager.createClientAccount(
            clienteData.email,
            clienteData.senha,
            clienteData.name
          );
          
          if (authResult.success) {
            log('✅ Conta criada com sucesso no cadastro:', authResult.message);
            audit('VINCULO_USER_CLIENTE', 'AUTH', { clienteEmail: clienteData.email, transportadoraId: user.transportadoraId });
          } else if ('error' in authResult) {
            warn('⚠️ Aviso na criação de conta:', authResult.error);
          }
        } catch (authError) {
          logError('Erro ao criar autenticação:', authError);
        }
      }

      // 3. Recarregar lista de clientes
      await loadClientes();
      
      return { id: data.id };
    } catch (err) {
      logError('Error adding cliente:', err);
      throw err;
    }
  };

  const loadClientes = async () => {
    if (!user?.transportadoraId) return;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('transportadora_id', user.transportadoraId)
        .eq('status', 'ativo');

      if (error) {
        logError('Error loading clientes:', error);
        return;
      }

      const clientesFormatted: User[] = data?.map(cliente => ({
        id: cliente.id,
        name: cliente.razao_social,
        email: cliente.email,
        type: 'cliente' as const,
        cnpj: cliente.cnpj,
        emailNotaFiscal: cliente.email_nota_fiscal,
        emailSolicitacaoLiberacao: cliente.email_solicitacao_liberacao,
        emailLiberacaoAutorizada: cliente.email_liberacao_autorizada,
      })) || [];

      setClientes(clientesFormatted);
    } catch (err) {
      logError('Error in loadClientes:', err);
    }
  };

  useEffect(() => {
    if (user?.transportadoraId) {
      loadClientes();
    }
  }, [user?.transportadoraId]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      signUp,
      isAuthenticated: !!user && !!session,
      loading,
      clientes,
      addCliente
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
