import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, AuthContextType } from '@/types/auth';

const SimplifiedAuthContext = createContext<AuthContextType | undefined>(undefined);

export function SimplifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (supabaseUser: SupabaseUser): Promise<User> => {
    try {
      const { data: result, error } = await supabase.rpc('get_user_data_optimized' as any, {
        p_user_id: supabaseUser.id,
        p_email: supabaseUser.email || ''
      });
      
      if (error) {
        return await loadUserDataFallback(supabaseUser);
      }
      
      if (result && Array.isArray(result) && result.length > 0) {
        const userData = result[0].user_data;
        return userData as User;
      }
      
      return await loadUserDataFallback(supabaseUser);
      
    } catch (error) {
      console.warn('⚠️ Loading error, using fallback:', error);
      return await loadUserDataFallback(supabaseUser);
    }
  }, []);

  const loadUserDataFallback = useCallback(async (supabaseUser: SupabaseUser): Promise<User> => {
    try {
      // Verificar se é usuário de transportadora
      const { data: transportadoraData } = await supabase
        .from('user_transportadoras')
        .select('role, transportadora_id')
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (transportadoraData) {
        return {
          id: supabaseUser.id,
          name: supabaseUser.email?.split('@')[0] || 'Usuário',
          email: supabaseUser.email || '',
          type: 'transportadora',
          role: transportadoraData.role,
          transportadoraId: transportadoraData.transportadora_id
        };
      }

      // Verificar se é cliente
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj, email_nota_fiscal, email_solicitacao_liberacao, email_liberacao_autorizada, transportadora_id')
        .eq('email', supabaseUser.email)
        .eq('status', 'ativo')
        .maybeSingle();

      if (clienteData) {
        return {
          id: supabaseUser.id,
          name: clienteData.razao_social,
          email: supabaseUser.email || '',
          type: 'cliente',
          cnpj: clienteData.cnpj,
          emailNotaFiscal: clienteData.email_nota_fiscal,
          emailSolicitacaoLiberacao: clienteData.email_solicitacao_liberacao,
          emailLiberacaoAutorizada: clienteData.email_liberacao_autorizada,
          clienteId: clienteData.id,
          transportadoraId: clienteData.transportadora_id
        };
      }

      // Usuário básico como fallback final
      return {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente'
      };
      
    } catch (error) {
      // Fallback absoluto - sempre funciona
      return {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Usuário',
        email: supabaseUser.email || '',
        type: 'cliente'
      };
    }
  }, []);

  // Handler para mudanças de autenticação
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    try {
      setSession(session);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setLoading(true);
        const userData = await loadUserData(session.user);
        setUser(userData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      setUser(null);
      setLoading(false);
    }
  }, [loadUserData]);

  // Login
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        setLoading(false);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Login exception:', error);
      setLoading(false);
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setLoading(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Configurar listener de autenticação
  useEffect(() => {
    // Configurar listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAuthStateChange('SIGNED_IN', session);
      } else {
        setLoading(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange]);

  const value: AuthContextType = {
    user,
    login,
    signUp: async () => ({ error: 'Not implemented' }),
    logout,
    isAuthenticated: !!user,
    loading,
    clientes: [],
    addCliente: async () => ({ id: '' })
  };

  return (
    <SimplifiedAuthContext.Provider value={value}>
      {children}
    </SimplifiedAuthContext.Provider>
  );
}

export function useSimplifiedAuth() {
  const context = useContext(SimplifiedAuthContext);
  if (context === undefined) {
    throw new Error('useSimplifiedAuth must be used within a SimplifiedAuthProvider');
  }
  return context;
}

export function useAuth() {
  return useSimplifiedAuth();
}