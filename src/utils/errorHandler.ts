import { error as logError, warn } from '@/utils/logger';
import { toast } from 'sonner';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
  field?: string;
  attempts?: number;
  lastError?: string;
}

export class SystemError extends Error {
  public context: ErrorContext;
  public severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string, 
    context: ErrorContext = {}, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'SystemError';
    this.context = {
      ...context,
      timestamp: Date.now()
    };
    this.severity = severity;
  }
}

/**
 * Handler centralizado para todos os erros do sistema
 */
export function handleError(error: unknown, context: ErrorContext = {}) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const systemError = error instanceof SystemError ? error : new SystemError(errorObj.message, context);

  // Log estruturado
  logError(`🚨 [${systemError.severity.toUpperCase()}] Erro em ${context.component || 'Sistema'}:`, {
    message: systemError.message,
    context: systemError.context,
    stack: systemError.stack,
    severity: systemError.severity
  });

  // Mostrar toast baseado na severidade
  switch (systemError.severity) {
    case 'critical':
      toast.error('Erro crítico no sistema. Entre em contato com o suporte.');
      break;
    case 'high':
      toast.error(`Erro: ${systemError.message}`);
      break;
    case 'medium':
      toast.error(`Atenção: ${systemError.message}`);
      break;
    case 'low':
      toast.warning(`Aviso: ${systemError.message}`);
      break;
  }

  // Em produção, enviar para serviço de monitoramento
  if (import.meta.env.MODE === 'production' && systemError.severity !== 'low') {
    // Implementar envio para Sentry/LogRocket/etc
    console.log('📡 Enviando erro para monitoramento:', systemError);
  }

  return systemError;
}

/**
 * Wrapper para async functions com tratamento de erro
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {}
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };
}

/**
 * Hook para tratamento consistente de erros em componentes
 */
export function useErrorHandler(componentName: string) {
  return (error: unknown, action?: string, metadata?: Record<string, any>) => {
    return handleError(error, {
      component: componentName,
      action,
      metadata
    });
  };
}

/**
 * Validação de dados com tratamento de erro
 */
export function validateRequired<T>(data: T, fieldName: string, context: ErrorContext = {}): T {
  if (data === null || data === undefined || data === '') {
    throw new SystemError(
      `Campo obrigatório '${fieldName}' não fornecido`,
      { ...context, field: fieldName },
      'medium'
    );
  }
  return data;
}

/**
 * Retry automático com backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: ErrorContext = {}
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw new SystemError(
          `Falha após ${maxRetries} tentativas: ${lastError.message}`,
          { ...context, attempts: attempt, lastError: lastError.message },
          'high'
        );
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      warn(`Tentativa ${attempt}/${maxRetries} falhou, tentando novamente em ${delay}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}