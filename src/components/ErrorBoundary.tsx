// Error Boundary React para capturar erros não tratados
import React from 'react';
import { error as logError } from '@/utils/optimizedLogger';
import { SecureIdGenerator } from '@/utils/memoryManager';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: SecureIdGenerator.generate('error')
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: SecureIdGenerator.generate('error')
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Filtrar erros comuns que não são críticos
    const isCommonError = error.message.includes('deferred DOM Node') ||
                         error.message.includes('ResizeObserver') ||
                         error.message.includes('Non-Error promise rejection');
    
    if (!isCommonError) {
      // Log do erro apenas se for significativo
      logError('🚨 ErrorBoundary capturou erro:', {
        error: error.message,
        stack: error.stack?.substring(0, 500), // Limitar tamanho do stack
        componentStack: errorInfo.componentStack?.substring(0, 300),
        errorId: this.state.errorId
      });
    }

    // Callback customizado
    this.props.onError?.(error, errorInfo);

    // Em produção, evitar envios excessivos para serviços de monitoramento
    if (import.meta.env.MODE === 'production' && !isCommonError) {
      // Rate limiting para evitar spam de erros
      const errorKey = `error_${error.message.substring(0, 50)}`;
      const lastSent = localStorage.getItem(errorKey);
      const now = Date.now();
      
      if (!lastSent || now - parseInt(lastSent) > 300000) { // 5 minutos
        localStorage.setItem(errorKey, now.toString());
        // Aqui enviaria para serviço quando habilitado
      }
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ 
        hasError: false, 
        error: undefined,
        errorId: SecureIdGenerator.generate('error')
      });
    } else {
      // Após máximo de retries, recarregar página
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Componente de fallback padrão
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
    <div className="max-w-md w-full mx-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Oops! Algo deu errado
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
        </p>
        
        {import.meta.env.MODE === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={retry} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Ir para Início
          </Button>
        </div>
        
        <p className="text-xs text-gray-400 mt-4">
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    </div>
  </div>
);

// Error Boundary específico para rotas
export const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      logError('🛣️ Erro na rota:', { error: error.message, componentStack: errorInfo.componentStack });
    }}
  >
    {children}
  </ErrorBoundary>
);

// Error Boundary para componentes críticos
export const CriticalErrorBoundary: React.FC<{ children: React.ReactNode; componentName?: string }> = ({ 
  children, 
  componentName = 'Componente crítico' 
}) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      logError(`🔥 Erro crítico em ${componentName}:`, { 
        error: error.message, 
        componentStack: errorInfo.componentStack 
      });
    }}
    fallback={({ error, retry }) => (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Erro em {componentName}</span>
        </div>
        <p className="text-red-600 text-sm mb-3">
          {error.message}
        </p>
        <Button size="sm" onClick={retry} variant="outline">
          Recarregar Componente
        </Button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);