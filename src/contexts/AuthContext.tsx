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

  // Initialize auth state
  useEffect(() => {
    console.log('Initializing auth state...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session with timeout
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session check result:', session?.user?.id, error);
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setLoading(false);
      }
    };

    checkSession();

    // Failsafe timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Auth loading timeout reached');
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Loading user profile for:', supabaseUser.id);
      
      // First check if this is a cliente (customer) - this is the most common case
      console.log('Checking cliente data...');
      
      try {
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('email', supabaseUser.email)
          .eq('status', 'ativo')
          .maybeSingle();
        
        console.log('Cliente query result:', { clienteData, clienteError });

        // If this is a cliente login, prioritize cliente data
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

          console.log('Cliente profile loaded:', userData);
          setUser(userData);
          setLoading(false);
          return;
        }
        
        if (clienteError) {
          console.error('Cliente query error:', clienteError);
        }
      } catch (clienteError) {
        console.error('Cliente query failed:', clienteError);
        // Continue to check system user profile
      }

      // If not a cliente, check for system user profile
      console.log('Checking profile data...');
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();
        
        console.log('Profile query result:', { profile, profileError });

        // Get user role and transportadora
        console.log('Checking user transportadora...');
        const { data: userTransportadora, error: roleError } = await supabase
          .from('user_transportadoras')
          .select(`
            role,
            is_active,
            transportadora_id
          `)
          .eq('user_id', supabaseUser.id)
          .eq('is_active', true)
          .maybeSingle();
        
        console.log('User transportadora result:', { userTransportadora, roleError });

        // Create user data for system users
        const userData: User = {
          id: supabaseUser.id,
          name: profile?.name || supabaseUser.email || '',
          email: profile?.email || supabaseUser.email || '',
          type: userTransportadora?.role === 'super_admin' ? 'transportadora' : 
                userTransportadora?.role === 'admin_transportadora' ? 'transportadora' :
                userTransportadora?.role === 'operador' ? 'transportadora' : 'cliente',
          cnpj: undefined,
          role: userTransportadora?.role,
          transportadoraId: userTransportadora?.transportadora_id
        };

        console.log('System user profile loaded:', userData);
        setUser(userData);
        setLoading(false);
      } catch (systemError) {
        console.error('System user queries failed:', systemError);
        // Fallback to basic user data
        throw systemError;
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // Even if there's an error, create a basic user object to prevent infinite loading
      const userData: User = {
        id: supabaseUser.id,
        name: supabaseUser.email || '',
        email: supabaseUser.email || '',
        type: 'cliente',
        cnpj: undefined,
        role: undefined,
        transportadoraId: undefined
      };
      setUser(userData);
      setLoading(false);
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const addCliente = async (clienteData: Omit<User, 'id' | 'type'>): Promise<void> => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      // Criar usuário no Supabase Auth se senha foi fornecida
      let authUserId = null;
      if (clienteData.senha) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: clienteData.email,
          password: clienteData.senha,
          options: {
            emailRedirectTo: `${window.location.origin}/cliente`
          }
        });

        if (authError) {
          console.error('Erro ao criar usuário de autenticação:', authError);
        } else {
          authUserId = authData.user?.id;
        }
      }

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
        }]);

      if (error) {
        throw error;
      }

      // Enviar email de notificação de forma assíncrona (não bloqueante)
      supabase.functions.invoke('send-notification-email', {
        body: {
          to: clienteData.email,
          subject: 'Bem-vindo ao Sistema WMS - Cliente Cadastrado',
          type: 'cliente_cadastrado',
          data: {
            nome: clienteData.name,
            email: clienteData.email,
            senha: clienteData.senha
          }
        }
      }).catch(emailError => {
        console.error('Erro ao enviar email de notificação:', emailError);
      });

      // Refresh clientes list
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

  // Load clientes when user changes
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