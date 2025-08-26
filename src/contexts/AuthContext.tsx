import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clientPasswordManager } from '@/utils/clientPasswordManager';
import { User, AuthContextType } from '@/types/auth';
import { log, warn, error as logError, audit } from '@/utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<User[]>([]);

  useEffect(() => {
    log('Initializing auth state...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to prevent blocking
          setTimeout(() => {
            loadUserProfile(session.user);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      log('Initial session check:', session?.user?.id);
      setSession(session);
      
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      log('Loading user profile for:', supabaseUser.id);
      
      // Force a fresh query by adding a timestamp
      const timestamp = Date.now();
      log('🔄 Query timestamp:', timestamp);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 3000);
      });

      // Try to get user data with timeout
      const userDataPromise = getUserData(supabaseUser);
      
      const userData = await Promise.race([userDataPromise, timeoutPromise]) as User;
      
      log('User profile loaded successfully:', userData);
      audit('LOGIN_SUCCESS', 'AUTH', { userId: supabaseUser.id, userEmail: userData.email });
      setUser(userData);
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
      setUser(fallbackUser);
      setLoading(false);
    }
  };

  const getUserData = async (supabaseUser: SupabaseUser): Promise<User> => {
    log('🔍 Starting getUserData for:', supabaseUser.email);
    
    // First check system user (admin/transportadora roles)
    try {
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

    // If not a system user, try cliente via email match 
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('email', supabaseUser.email)
        .eq('status', 'ativo')
        .maybeSingle();

      log('🔍 Cliente query result:', clienteData);

      if (clienteData && !clienteError) {
        const userData: User = {
          id: clienteData.id,
          name: clienteData.razao_social,
          email: clienteData.email,
          type: 'cliente',
          cnpj: clienteData.cnpj,
          emailNotaFiscal: clienteData.email_nota_fiscal,
          emailSolicitacaoLiberacao: clienteData.email_solicitacao_liberacao,
          emailLiberacaoAutorizada: clienteData.email_liberacao_autorizada,
          transportadoraId: clienteData.transportadora_id
        };

        log('🔍 Cliente user detected:', userData);
        return userData;
      }
    } catch (error) {
      logError('Error checking cliente:', error);
    }

    // Fallback - create basic user
    warn('🔍 Using fallback user data');
    throw new Error('User not found in any table');
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