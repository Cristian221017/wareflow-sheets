// Sistema de throttling para evitar spam de erros
// Problema identificado na varredura: Loop NF_DELETE_FAIL (16+ ocorrências)

interface ThrottleEntry {
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
}

class ErrorThrottleManager {
  private throttleMap = new Map<string, ThrottleEntry>();
  private readonly MAX_ERRORS_PER_MINUTE = 3;
  private readonly THROTTLE_WINDOW = 60 * 1000; // 1 minuto
  private readonly RESET_WINDOW = 5 * 60 * 1000; // 5 minutos

  shouldLog(errorKey: string): boolean {
    const now = Date.now();
    const entry = this.throttleMap.get(errorKey);

    if (!entry) {
      // Primeira ocorrência
      this.throttleMap.set(errorKey, {
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now
      });
      return true;
    }

    // Verificar se passou da janela de reset
    if (now - entry.lastOccurrence > this.RESET_WINDOW) {
      // Reset do contador
      this.throttleMap.set(errorKey, {
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now
      });
      return true;
    }

    // Atualizar entrada
    entry.count++;
    entry.lastOccurrence = now;

    // Verificar se está dentro do limite
    const timeWindow = now - entry.firstOccurrence;
    if (timeWindow < this.THROTTLE_WINDOW && entry.count > this.MAX_ERRORS_PER_MINUTE) {
      // Throttled - não logar
      return false;
    }

    return true;
  }

  getThrottleStats(): Record<string, ThrottleEntry> {
    const stats: Record<string, ThrottleEntry> = {};
    for (const [key, value] of this.throttleMap.entries()) {
      stats[key] = { ...value };
    }
    return stats;
  }

  clearThrottleData(): void {
    this.throttleMap.clear();
  }

  // Cleanup de entradas antigas
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.throttleMap.entries()) {
      if (now - entry.lastOccurrence > this.RESET_WINDOW) {
        this.throttleMap.delete(key);
      }
    }
  }
}

export const errorThrottle = new ErrorThrottleManager();

// Cleanup automático a cada 10 minutos
setInterval(() => {
  errorThrottle.cleanup();
}, 10 * 60 * 1000);

// Função utilitária para criar chave única de erro
export function createErrorKey(action: string, entityType: string, errorMessage: string, context?: any): string {
  const baseKey = `${action}_${entityType}_${errorMessage}`;
  
  // Para alguns tipos de erro, incluir contexto específico
  if (context?.nfId || context?.cleanNfId) {
    return `${baseKey}_${context.nfId || context.cleanNfId}`;
  }
  
  if (context?.userId) {
    return `${baseKey}_${context.userId}`;
  }
  
  return baseKey;
}