// Utilitário para retry com backoff exponencial
import { log, warn, error } from './logger';

interface RetryOptions {
  maxRetries?: number;
  timeout?: number;
  backoffMultiplier?: number;
  initialDelay?: number;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 2,
    timeout = 3000,
    backoffMultiplier = 1.5,
    initialDelay = 1000
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Aplicar timeout na função
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout após ${timeout}ms (tentativa ${attempt})`)), timeout)
        )
      ]);

      if (attempt > 1) {
        log(`✅ Sucesso na tentativa ${attempt}`);
      }

      return result;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        error(`❌ Falha final após ${maxRetries} tentativas:`, err);
        throw err;
      }

      // Calcular delay com backoff exponencial
      const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
      warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${delay}ms:`, err);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries reached');
};

// Função específica para timeouts com retry
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeout: number,
  errorMessage: string = 'Operation timeout'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeout)
    )
  ]);
};

// Função para retry em operações críticas de auth
export const withAuthRetry = <T>(fn: () => Promise<T>) =>
  withRetry(fn, {
    maxRetries: 3,
    timeout: 3000,
    backoffMultiplier: 1.5,
    initialDelay: 500
  });