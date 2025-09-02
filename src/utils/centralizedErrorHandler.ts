// Sistema centralizado de tratamento de erros
import { log, warn, error as logError, auditError } from './logger';

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerConfig {
  logToConsole: boolean;
  logToRemote: boolean;
  showToast: boolean;
  retryable: boolean;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CentralizedError {
  id: string;
  message: string;
  originalError: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  timestamp: number;
  handled: boolean;
}

class CentralizedErrorHandler {
  private errors: Map<string, CentralizedError> = new Map();
  private errorQueue: CentralizedError[] = [];
  private maxErrors = 100;
  private retryCount = new Map<string, number>();
  private maxRetries = 3;

  // Configuração padrão
  private defaultConfig: ErrorHandlerConfig = {
    logToConsole: true,
    logToRemote: false,
    showToast: true,
    retryable: false
  };

  handleError(
    error: Error | string,
    context: ErrorContext,
    severity: ErrorSeverity = 'medium',
    config: Partial<ErrorHandlerConfig> = {}
  ): CentralizedError {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorId = this.generateErrorId(errorObj, context);
    
    const centralizedError: CentralizedError = {
      id: errorId,
      message: errorObj.message,
      originalError: errorObj,
      context,
      severity,
      timestamp: Date.now(),
      handled: false
    };

    // Evitar duplicatas recentes (últimos 30 segundos)
    const existingError = this.errors.get(errorId);
    if (existingError && (Date.now() - existingError.timestamp < 30000)) {
      warn(`⚠️ Erro duplicado ignorado: ${errorId}`);
      return existingError;
    }

    this.errors.set(errorId, centralizedError);
    this.errorQueue.push(centralizedError);
    
    // Manter limite de erros em memória
    if (this.errorQueue.length > this.maxErrors) {
      const oldError = this.errorQueue.shift();
      if (oldError) {
        this.errors.delete(oldError.id);
      }
    }

    // Processar erro baseado na configuração
    this.processError(centralizedError, finalConfig);
    
    return centralizedError;
  }

  private processError(error: CentralizedError, config: ErrorHandlerConfig): void {
    const { severity, context, originalError, message } = error;

    // 1. Log baseado na severidade
    if (config.logToConsole) {
      switch (severity) {
        case 'low':
          log(`ℹ️ [${context.component}] ${message}`, { context, error: originalError });
          break;
        case 'medium':
          warn(`⚠️ [${context.component}] ${message}`, { context, error: originalError });
          break;
        case 'high':
        case 'critical':
          logError(`❌ [${context.component}] ${message}`, { context, error: originalError });
          break;
      }
    }

    // 2. Audit log para severidades altas
    if (severity === 'high' || severity === 'critical') {
      auditError(
        context.action.toUpperCase() + '_ERROR',
        context.component.toUpperCase(),
        originalError,
        context.metadata
      );
    }

    // 3. Toast para usuário (apenas se não for erro técnico)
    if (config.showToast && this.shouldShowToast(error)) {
      this.showUserFriendlyToast(error);
    }

    // 4. Remote logging (produção)
    if (config.logToRemote && this.shouldLogRemotely(error)) {
      this.logToRemoteService(error);
    }

    error.handled = true;
  }

  private generateErrorId(error: Error, context: ErrorContext): string {
    const hash = this.simpleHash(error.message + context.component + context.action);
    return `err_${hash}_${Date.now().toString(36)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private shouldShowToast(error: CentralizedError): boolean {
    // Não mostrar toast para erros de rede ou técnicos
    const technicalErrors = ['Network Error', 'CORS', 'TypeError', 'ReferenceError'];
    return !technicalErrors.some(tech => error.message.includes(tech));
  }

  private shouldLogRemotely(error: CentralizedError): boolean {
    // Log remoto apenas para severidades médias ou altas
    return error.severity !== 'low';
  }

  private showUserFriendlyToast(error: CentralizedError): void {
    // Importação dinâmica para evitar circular dependency
    import('sonner').then(({ toast }) => {
      const friendlyMessage = this.getFriendlyErrorMessage(error);
      
      switch (error.severity) {
        case 'low':
          toast.info(friendlyMessage);
          break;
        case 'medium':
          toast.warning(friendlyMessage);
          break;
        case 'high':
        case 'critical':
          toast.error(friendlyMessage);
          break;
      }
    }).catch(() => {
      // Fallback se toast não estiver disponível
      console.warn('Toast não disponível para mostrar erro:', error.message);
    });
  }

  private getFriendlyErrorMessage(error: CentralizedError): string {
    const { message, context } = error;
    
    // Mensagens amigáveis baseadas no contexto
    const friendlyMessages: Record<string, string> = {
      'auth': 'Erro de autenticação. Tente fazer login novamente.',
      'network': 'Problema de conexão. Verifique sua internet.',
      'validation': 'Dados inválidos. Verifique os campos preenchidos.',
      'permission': 'Você não tem permissão para esta ação.',
      'not_found': 'Recurso não encontrado.',
      'server': 'Erro interno do servidor. Tente novamente mais tarde.'
    };

    // Detectar tipo de erro
    for (const [type, friendlyMsg] of Object.entries(friendlyMessages)) {
      if (message.toLowerCase().includes(type) || context.action.includes(type)) {
        return friendlyMsg;
      }
    }

    // Fallback genérico
    return `Erro em ${context.component}: ${message}`;
  }

  private async logToRemoteService(error: CentralizedError): Promise<void> {
    // Em ambiente de produção, enviar para serviço de monitoramento
    if (import.meta.env.MODE === 'production') {
      try {
        // Exemplo: Sentry, LogRocket, etc.
        // await Sentry.captureException(error.originalError, {
        //   contexts: { custom: error.context },
        //   level: error.severity as any,
        //   extra: { errorId: error.id }
        // });
        
        logError('📤 Erro enviado para monitoramento remoto:', error.id);
      } catch (remoteError) {
        warn('⚠️ Falha ao enviar erro para serviço remoto:', remoteError);
      }
    }
  }

  // Retry logic para operações
  async retryOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    const operationId = `${context.component}_${context.action}`;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const result = await operation();
        
        // Reset retry count on success
        this.retryCount.delete(operationId);
        return result;
      } catch (error) {
        attempts++;
        const currentRetries = this.retryCount.get(operationId) || 0;
        this.retryCount.set(operationId, currentRetries + 1);

        const isLastAttempt = attempts === maxRetries;
        const severity: ErrorSeverity = isLastAttempt ? 'high' : 'medium';

        this.handleError(
          error as Error,
          { ...context, metadata: { ...context.metadata, attempt: attempts, maxRetries } },
          severity,
          { retryable: !isLastAttempt }
        );

        if (isLastAttempt) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Maximum retry attempts reached');
  }

  // Métricas e monitoramento
  getErrorMetrics() {
    const now = Date.now();
    const last24h = this.errorQueue.filter(err => now - err.timestamp < 24 * 60 * 60 * 1000);
    
    const severityCounts = last24h.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: this.errors.size,
      errorsLast24h: last24h.length,
      severityBreakdown: severityCounts,
      mostCommonComponents: this.getMostCommonComponents(last24h),
      retryStatistics: Object.fromEntries(this.retryCount)
    };
  }

  private getMostCommonComponents(errors: CentralizedError[]) {
    const componentCounts = errors.reduce((acc, err) => {
      acc[err.context.component] = (acc[err.context.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(componentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([component, count]) => ({ component, count }));
  }

  // Limpar erros antigos
  cleanup(): void {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Remover erros mais antigos que uma semana
    this.errorQueue = this.errorQueue.filter(err => err.timestamp > weekAgo);
    
    // Recriar Map com erros filtrados
    this.errors.clear();
    this.errorQueue.forEach(err => this.errors.set(err.id, err));
    
    log(`🧹 ErrorHandler cleanup: mantidos ${this.errors.size} erros`);
  }
}

// Singleton instance
export const centralizedErrorHandler = new CentralizedErrorHandler();

// Convenience functions
export const handleError = (
  error: Error | string,
  context: ErrorContext,
  severity: ErrorSeverity = 'medium',
  config?: Partial<ErrorHandlerConfig>
) => centralizedErrorHandler.handleError(error, context, severity, config);

export const retryOperation = <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries?: number
) => centralizedErrorHandler.retryOperation(operation, context, maxRetries);

// Cleanup automático
if (typeof window !== 'undefined') {
  // Cleanup diário
  setInterval(() => centralizedErrorHandler.cleanup(), 24 * 60 * 60 * 1000);
}