import { supabase } from "@/integrations/supabase/client";

const isProd = import.meta.env.MODE === "production";

// Sistema de logging em memória para debugging
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  meta?: any;
  source?: string;
}

class InMemoryLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  addLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      source: this.getSource()
    };

    this.logs.unshift(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  private getSource(): string {
    const error = new Error();
    const stack = error.stack?.split('\n');
    if (stack && stack.length > 4) {
      const caller = stack[4];
      const match = caller.match(/at\s+(.+?)\s+\(/);
      return match ? match[1] : 'unknown';
    }
    return 'unknown';
  }

  getLogs(level?: 'INFO' | 'WARN' | 'ERROR'): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  getRecentLogs(minutes: number = 10): LogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

const inMemoryLogger = new InMemoryLogger();

export function normalizeError(err: any) {
  if (!err) return { message: "Unknown error" };

  // Supabase PostgrestError / AuthError / StorageError
  const pg = (err as any);
  const norm: any = {
    name: pg.name ?? err?.constructor?.name ?? "Error",
    message: pg.message ?? String(pg),
    code: pg.code ?? pg.status ?? undefined,
    details: pg.details ?? undefined,
    hint: pg.hint ?? undefined,
    status: pg.status ?? undefined,
  };

  // Fetch/Response
  if (pg instanceof Response) {
    norm.name = "FetchResponse";
    norm.status = pg.status;
    norm.statusText = pg.statusText;
  }

  // Stack (somente em dev para não poluir)
  if (!isProd && (pg.stack || err?.stack)) {
    norm.stack = (pg.stack ?? err.stack)?.toString().split("\n").slice(0, 8).join("\n");
  }
  return norm;
}

function redact(obj: any): any {
  const replacer = (key: string, value: any) => {
    const k = key.toLowerCase();
    if (k.includes("password") || k.includes("token") || k.includes("secret")) return "[REDACTED]";
    if (k.includes("email")) return typeof value === "string" ? value.replace(/(.{2}).+(@.+)/, "$1***$2") : value;
    if (k.includes("cnpj")) return typeof value === "string" ? value.replace(/(\d{5})\d+/, "$1***") : value;
    return value;
  };
  try {
    return JSON.parse(JSON.stringify(obj, replacer));
  } catch {
    return obj;
  }
}

function correlationId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
}

// Persistência resiliente no banco
async function persistLog(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  meta?: Record<string, any>,
  action = "LOG",
  entity_type = "FRONTEND",
) {
  const payload = {
    p_entity_type: entity_type,
    p_action: action,
    p_status: level,
    p_message: message?.toString().slice(0, 4000) ?? null,
    p_meta: redact(meta ?? {}),
  };

  try {
    // chama RPC diretamente (não depende de tipos gerados)
    const { error } = await (supabase.rpc as any)("log_system_event", payload);
    if (error && !isProd) console.warn("[logger] log_system_event error:", error.message);
  } catch (e: any) {
    if (!isProd) console.warn("[logger] persistLog failed:", e?.message || e);
  }
}

// API amigável: primeiro arg string = message; args extras viram meta
function foldArgsToMeta(args: any[]): { message: string; meta?: any } {
  if (!args?.length) return { message: "" };
  const [first, ...rest] = args;
  if (typeof first === "string") {
    const meta = rest.length ? { args: redact(rest) } : undefined;
    return { message: first, meta };
  }
  // se o primeiro já for um objeto/erro
  return { message: "object", meta: redact([first, ...rest]) };
}

export const log = (...args: any[]) => {
  if (!isProd) console.log(...args);
  const { message, meta } = foldArgsToMeta(args);
  inMemoryLogger.addLog("INFO", message, meta);
  void persistLog("INFO", message, meta);
};

export const warn = (...args: any[]) => {
  if (!isProd) console.warn(...args);
  const { message, meta } = foldArgsToMeta(args);
  inMemoryLogger.addLog("WARN", message, meta);
  void persistLog("WARN", message, meta);
};

export const error = (...args: any[]) => {
  // sempre mostra erro no console em qualquer ambiente
  console.error(...args);
  const { message, meta } = foldArgsToMeta(args);
  // Se houver erro bruto nos args, normaliza e inclui no meta
  const errObj = args.find(a => a instanceof Error || (a && a.message && a.name));
  const merged = errObj ? { ...(meta ?? {}), error: normalizeError(errObj) } : meta;
  inMemoryLogger.addLog("ERROR", message, merged);
  void persistLog("ERROR", message, merged);
};

// Funcionalidades adicionais para debugging
export const debug = (...args: any[]) => {
  if (!isProd) {
    console.debug(...args);
    const { message, meta } = foldArgsToMeta(args);
    inMemoryLogger.addLog("INFO", `[DEBUG] ${message}`, meta);
  }
};

// Getters para logs em memória
export const getLogs = (level?: 'INFO' | 'WARN' | 'ERROR') => inMemoryLogger.getLogs(level);
export const getRecentLogs = (minutes?: number) => inMemoryLogger.getRecentLogs(minutes);
export const clearLogs = () => inMemoryLogger.clearLogs();
export const exportLogs = () => inMemoryLogger.exportLogs();

// Hook para React
export function useLogger() {
  return {
    log,
    warn,
    error,
    debug,
    audit,
    auditError,
    getLogs,
    getRecentLogs,
    clearLogs,
    exportLogs
  };
}

// Auditoria com action/entity explícitos
export const audit = (
  action: string,
  entity_type: string,
  meta?: any,
  level: "INFO" | "WARN" | "ERROR" = "INFO",
) => {
  const cid = correlationId();
  const merged = { correlationId: cid, ...(meta ? redact(meta) : undefined) };
  void persistLog(level, `${action} em ${entity_type}`, merged, action, entity_type);
};

// Utilitário para registrar erro com action/entity e erro normalizado
export const auditError = (action: string, entity_type: string, err: any, ctx?: any) => {
  const cid = correlationId();
  void persistLog(
    "ERROR",
    `${action} em ${entity_type}`,
    { correlationId: cid, error: normalizeError(err), context: redact(ctx) },
    action,
    entity_type
  );
};