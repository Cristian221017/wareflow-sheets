// Wrapper para migração gradual - permite usar AMBOS AuthContext e useSecureAuth
import React, { createContext, useContext, ReactNode } from 'react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import type { User } from '@/types/auth';
import { log } from '@/utils/productionLogger';

interface MigrationAuthContextType {
  // Dados do auth (prioriza useSecureAuth se disponível)
  user: User | null;
  session?: any; // Opcional para compatibilidade
  loading: boolean;
  error?: string | null; // Opcional para compatibilidade
  isAuthenticated: boolean;
  
  // Métodos
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  
  // Controle de migração
  migrationMode: 'legacy' | 'secure' | 'hybrid';
  isSecureAuthActive: boolean;
}

const MigrationAuthContext = createContext<MigrationAuthContextType | undefined>(undefined);

interface SecureAuthWrapperProps {
  children: ReactNode;
  // Flag para controlar qual implementação usar
  useSecureAuth?: boolean;
  // Modo de migração
  mode?: 'legacy' | 'secure' | 'hybrid';
}

export function SecureAuthWrapper({ 
  children, 
  useSecureAuth: forceSecureAuth = false,
  mode = 'hybrid' 
}: SecureAuthWrapperProps) {
  
  // Auth legado (sempre disponível)
  const legacyAuth = useAuthContext();
  
  // Auth seguro (sempre executado para seguir Hook Rules)
  const secureAuthResult = useSecureAuth();
  
  // Usar secureAuth apenas se habilitado
  const secureAuth = forceSecureAuth || mode !== 'legacy' ? secureAuthResult : {
    user: null,
    session: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    login: async () => ({ success: false, error: 'Not enabled' }),
    logout: async () => {},
    refreshUser: () => Promise.resolve(null),
    clearError: () => {},
    sessionId: ''
  };

  // Determinar qual auth usar baseado no modo
  const activeAuth = React.useMemo(() => {
    // Wrappers para compatibilidade de tipos
    const wrapLogout = (logoutFn: () => void) => async () => {
      logoutFn();
    };

    switch (mode) {
      case 'legacy':
        log('🔄 Usando AuthContext legado');
        return {
          user: legacyAuth.user,
          session: null, // legacyAuth pode não ter session
          loading: legacyAuth.loading,
          error: null, // legacyAuth pode não ter error
          isAuthenticated: legacyAuth.isAuthenticated,
          login: legacyAuth.login,
          logout: wrapLogout(legacyAuth.logout),
          migrationMode: 'legacy' as const,
          isSecureAuthActive: false
        };
        
      case 'secure':
        log('🔄 Usando useSecureAuth');
        return {
          user: secureAuth.user,
          session: secureAuth.session,
          loading: secureAuth.loading,
          error: secureAuth.error,
          isAuthenticated: secureAuth.isAuthenticated,
          login: secureAuth.login,
          logout: secureAuth.logout,
          migrationMode: 'secure' as const,
          isSecureAuthActive: true
        };
        
      case 'hybrid':
      default:
        // Híbrido: usa secureAuth se disponível e funcionando, senão legado
        const isSecureReady = !secureAuth.loading && !secureAuth.error;
        const useSecure = isSecureReady && secureAuth.user !== null;
        
        if (useSecure) {
          log('🔄 Híbrido: Usando useSecureAuth (preferência)');
          return {
            user: secureAuth.user,
            session: secureAuth.session,
            loading: secureAuth.loading,
            error: secureAuth.error,
            isAuthenticated: secureAuth.isAuthenticated,
            login: secureAuth.login,
            logout: secureAuth.logout,
            migrationMode: 'hybrid' as const,
            isSecureAuthActive: true
          };
        } else {
          log('🔄 Híbrido: Usando AuthContext legado (fallback)');
          return {
            user: legacyAuth.user,
            session: null, // legacyAuth pode não ter session
            loading: legacyAuth.loading,
            error: null, // legacyAuth pode não ter error
            isAuthenticated: legacyAuth.isAuthenticated,
            login: legacyAuth.login,
            logout: wrapLogout(legacyAuth.logout),
            migrationMode: 'hybrid' as const,
            isSecureAuthActive: false
          };
        }
    }
  }, [legacyAuth, secureAuth, mode]);

  return (
    <MigrationAuthContext.Provider value={activeAuth}>
      {children}
    </MigrationAuthContext.Provider>
  );
}

// Hook para usar durante migração
export function useMigrationAuth() {
  const context = useContext(MigrationAuthContext);
  if (context === undefined) {
    throw new Error('useMigrationAuth deve ser usado dentro de um SecureAuthWrapper');
  }
  return context;
}

// Hook de compatibilidade - pode substituir useAuth gradualmente
export function useAuthMigration() {
  const context = useContext(MigrationAuthContext);
  
  // Se não está dentro do wrapper, usa o legado
  if (!context) {
    return useAuthContext();
  }
  
  return context;
}