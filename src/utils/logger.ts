import { supabase } from "@/integrations/supabase/client";

const isProd = import.meta.env.MODE === "production";

// persistência mínima e resiliente
async function persistLog(level: "INFO"|"WARN"|"ERROR", message: string, meta?: any) {
  try {
    // chama RPC diretamente (não depende de tipos gerados)
    const { error } = await (supabase.rpc as any)("log_system_event", {
      p_entity_type: "FRONTEND",
      p_action: "LOG",
      p_status: level,
      p_message: message?.toString().slice(0, 4000) ?? null,
      p_meta: meta ?? {}
    });
    if (error && !isProd) console.warn("[logger] rpc log_system_event error:", error.message);
  } catch (e: any) {
    if (!isProd) console.warn("[logger] persistLog failed:", e?.message || e);
  }
}

export const log = (...args: any[]) => {
  if (!isProd) console.log(...args);
  void persistLog("INFO", args.map(String).join(" "));
};

export const warn = (...args: any[]) => {
  if (!isProd) console.warn(...args);
  void persistLog("WARN", args.map(String).join(" "));
};

export const error = (...args: any[]) => {
  console.error(...args); // sempre mostra erro
  void persistLog("ERROR", args.map(String).join(" "));
};

// auditoria sem ruído visual
export const audit = (action: string, entity_type: string, meta?: any) => {
  void persistLog("INFO", `${action} em ${entity_type}`, meta);
};