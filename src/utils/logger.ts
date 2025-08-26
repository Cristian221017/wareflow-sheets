import { supabase } from "@/integrations/supabase/client";

const isProd = import.meta.env.MODE === 'production';

type LogPayload = {
  level: 'INFO' | 'WARN' | 'ERROR';
  entity_type?: string;
  action?: string;
  message?: string;
  meta?: Record<string, any>;
  actor_role?: string;
  correlation_id?: string;
  tenant_id?: string;
};

async function persistLog(p: LogPayload) {
  try {
    // Usar SQL raw para evitar problemas de tipagem até regenerar types
    const { error } = await supabase.rpc('log_event', {
      p_level: p.level,
      p_message: p.message || '',
      p_entity_type: p.entity_type || 'SYSTEM',
      p_action: p.action || 'LOG',
      p_meta: p.meta || {}
    });
    
    if (error && !isProd) console.error('[logger.persist] fail', error);
  } catch (e) {
    if (!isProd) console.error('[logger.persist] catch', e);
  }
}

export const log = (...args: any[]) => { 
  if (!isProd) console.log(...args);
  void persistLog({ level: 'INFO', message: args.join(' '), meta: {} });
};

export const warn = (...args: any[]) => { 
  if (!isProd) console.warn(...args);
  void persistLog({ level: 'WARN', message: args.join(' '), meta: {} });
};

export const error = (...args: any[]) => {
  console.error(...args); // sempre loga erro
  void persistLog({ level: 'ERROR', message: args.join(' '), meta: {} });
};

// Função específica para logs de auditoria importantes
export const audit = (action: string, entity_type: string, meta?: any) => {
  void persistLog({ 
    level: 'INFO', 
    action, 
    entity_type, 
    message: `${action} em ${entity_type}`,
    meta 
  });
};

export const log = (...args: any[]) => { 
  if (!isProd) console.log(...args);
  void persistLog({ level: 'INFO', message: args.join(' '), meta: {} });
};

export const warn = (...args: any[]) => { 
  if (!isProd) console.warn(...args);
  void persistLog({ level: 'WARN', message: args.join(' '), meta: {} });
};

export const error = (...args: any[]) => {
  console.error(...args); // sempre loga erro
  void persistLog({ level: 'ERROR', message: args.join(' '), meta: {} });
};

// Função específica para logs de auditoria importantes
export const audit = (action: string, entity_type: string, meta?: any) => {
  void persistLog({ 
    level: 'INFO', 
    action, 
    entity_type, 
    message: `${action} em ${entity_type}`,
    meta 
  });
};