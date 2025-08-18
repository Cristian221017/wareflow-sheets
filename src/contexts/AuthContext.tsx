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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
        return;
      }

      // Get user role and transportadora
      const { data: userTransportadora, error: roleError } = await supabase
        .from('user_transportadoras')
        .select(`
          role,
          is_active,
          transportadora_id
        `)
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error loading user role:', roleError);
      }

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

      setUser(userData);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
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