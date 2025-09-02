// Error Boundaries estratégicos para componentes críticos do sistema
import React from 'react';
import { ErrorBoundary, CriticalErrorBoundary } from '@/components/ErrorBoundary';
import { log, error as logError } from '@/utils/productionLogger';

// Error Boundary específico para Auth
export const AuthErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CriticalErrorBoundary componentName="Sistema de Autenticação">
    {children}
  </CriticalErrorBoundary>
);

// Error Boundary para WMS/Contextos de dados
export const DataContextErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      logError('🔥 Erro crítico em Context de dados', { 
        error: error.message, 
        stack: error.stack,
        componentStack: errorInfo.componentStack 
      });
      
      // Em produção: tentar recuperação automática dos dados
      if (import.meta.env.MODE === 'production') {
        // Trigger de recuperação de dados após 5 segundos
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    }}
    fallback={({ error, retry }) => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-lg w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Erro no Sistema de Dados
          </h2>
          
          <p className="text-gray-600 mb-6">
            Ocorreu um problema ao carregar os dados. Nossa equipe foi notificada automaticamente.
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={retry}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Tentar Novamente
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Ir para Início
            </button>
          </div>
          
          {import.meta.env.MODE === 'production' && (
            <p className="text-xs text-gray-400 mt-4">
              A página será recarregada automaticamente em alguns segundos...
            </p>
          )}
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

// Error Boundary para componentes de UI críticos
export const UIErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  componentName?: string;
}> = ({ children, componentName = "Interface" }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      logError(`🎨 Erro de UI em ${componentName}`, { 
        error: error.message,
        componentStack: errorInfo.componentStack 
      });
    }}
    fallback={({ error, retry }) => (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4 m-2">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Erro no {componentName}
            </h3>
            
            <p className="mt-1 text-sm text-red-700">
              Este componente encontrou um erro e não pôde ser exibido.
            </p>
            
            <div className="mt-4">
              <button
                onClick={retry}
                className="bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium py-1 px-2 rounded border border-red-300 transition-colors"
              >
                Recarregar Componente
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

// Error Boundary para rotas específicas
export const RouteSpecificErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  routeName: string;
}> = ({ children, routeName }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      logError(`🛣️ Erro na rota ${routeName}`, { 
        error: error.message,
        route: routeName,
        componentStack: errorInfo.componentStack 
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

// HOC para envolver componentes automaticamente
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  boundaryType: 'ui' | 'critical' | 'data' = 'ui',
  componentName?: string
) {
  const WrappedComponent = (props: T) => {
    const name = componentName || Component.displayName || Component.name || 'Componente';
    
    switch (boundaryType) {
      case 'critical':
        return (
          <CriticalErrorBoundary componentName={name}>
            <Component {...props} />
          </CriticalErrorBoundary>
        );
        
      case 'data':
        return (
          <DataContextErrorBoundary>
            <Component {...props} />
          </DataContextErrorBoundary>
        );
        
      case 'ui':
      default:
        return (
          <UIErrorBoundary componentName={name}>
            <Component {...props} />
          </UIErrorBoundary>
        );
    }
  };
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}