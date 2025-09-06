import { log } from './logger';

interface RealtimeDebugInfo {
  timestamp: string;
  table: string;
  eventType: string;
  nfId?: string;
  nfNumero?: string;
  oldStatus?: string;
  newStatus?: string;
  oldStatusSeparacao?: string;
  newStatusSeparacao?: string;
}

class RealtimeDebugger {
  private events: RealtimeDebugInfo[] = [];
  private maxEvents = 50;

  logRealtimeEvent(payload: any, table: string) {
    const debugInfo: RealtimeDebugInfo = {
      timestamp: new Date().toISOString(),
      table,
      eventType: payload.eventType || 'UNKNOWN',
    };

    if (table === 'notas_fiscais' && payload.new) {
      debugInfo.nfId = payload.new.id;
      debugInfo.nfNumero = payload.new.numero_nf;
      
      if (payload.old) {
        debugInfo.oldStatus = payload.old.status;
        debugInfo.newStatus = payload.new.status;
        debugInfo.oldStatusSeparacao = payload.old.status_separacao;
        debugInfo.newStatusSeparacao = payload.new.status_separacao;
      }
    }

    this.events.unshift(debugInfo);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Log crítico para comunicação entre portais
    if (debugInfo.oldStatusSeparacao !== debugInfo.newStatusSeparacao) {
      log(`🔄 REALTIME DEBUG: Status separação alterado!`, {
        nf: debugInfo.nfNumero,
        antes: debugInfo.oldStatusSeparacao,
        depois: debugInfo.newStatusSeparacao,
        timestamp: debugInfo.timestamp
      });
    }
  }

  getRecentEvents(limit = 10): RealtimeDebugInfo[] {
    return this.events.slice(0, limit);
  }

  getEventsByNF(nfNumero: string): RealtimeDebugInfo[] {
    return this.events.filter(event => event.nfNumero === nfNumero);
  }

  clearEvents() {
    this.events = [];
    log('🧹 Debug events cleared');
  }
}

export const realtimeDebugger = new RealtimeDebugger();