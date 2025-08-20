import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<User[]>([]);

  useEffect(() => {
    console.log('Initializing auth state...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
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
      console.log('Initial session check:', session?.user?.id);
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
      console.log('Loading user profile for:', supabaseUser.id);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 3000);
      });

      // Try to get user data with timeout
      const userDataPromise = getUserData(supabaseUser);
      
      const userData = await Promise.race([userDataPromise, timeoutPromise]) as User;
      
      console.log('User profile loaded successfully:', userData);
      setUser(userData);
      setLoading(false);

    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Create fallback user data
      const fallbackUser: User = {
        id: supabaseUser.id,
        name: supabaseUser.email || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente',
        role: undefined,
        transportadoraId: undefined
      };
      
      console.log('Using fallback user data:', fallbackUser);
      setUser(fallbackUser);
      setLoading(false);
    }
  };

  const getUserData = async (supabaseUser: SupabaseUser): Promise<User> => {
    // First try to find cliente data
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('email', supabaseUser.email)
        .eq('status', 'ativo')
        .maybeSingle();

      if (clienteData && !clienteError) {
        return {
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
      }
    } catch (error) {
      console.log('Cliente query failed, trying system user...');
    }

    // If not a cliente, try system user
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

      return {
        id: supabaseUser.id,
        name: profile?.name || supabaseUser.email || 'Usuário',
        email: profile?.email || supabaseUser.email || '',
        type: userRole?.role === 'super_admin' ? 'transportadora' : 
              userRole?.role === 'admin_transportadora' ? 'transportadora' :
              userRole?.role === 'operador' ? 'transportadora' : 'cliente',
        role: userRole?.role,
        transportadoraId: userRole?.transportadora_id
      };

    } catch (error) {
      console.log('System user query failed, using basic data...');
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        setLoading(false);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const addCliente = async (clienteData: Omit<User, 'id' | 'type'>): Promise<void> => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      // 1. Inserir cliente na tabela clientes
      const { error } = await supabase
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
        }]);

      if (error) {
        throw error;
      }

      // 2. Se uma senha foi fornecida, criar conta de usuário
      if (clienteData.senha) {
        try {
          const { error: authError } = await supabase.auth.signUp({
            email: clienteData.email,
            password: clienteData.senha,
            options: {
              emailRedirectTo: `${window.location.origin}/cliente`,
              data: {
                name: clienteData.name,
                cnpj: clienteData.cnpj
              }
            }
          });

          if (authError && !authError.message.includes('User already registered')) {
            console.error('Erro ao criar conta de usuário:', authError);
            // Não falha o cadastro do cliente se a auth falhar
          }
        } catch (authError) {
          console.error('Erro ao criar autenticação:', authError);
          // Não falha o cadastro do cliente se a auth falhar
        }
      }

      await loadClientes();
    } catch (error) {
      console.error('Error adding cliente:', error);
      throw error;
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
        console.error('Error loading clientes:', error);
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
    } catch (error) {
      console.error('Error in loadClientes:', error);
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