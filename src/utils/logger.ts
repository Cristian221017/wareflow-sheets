const isProd = import.meta.env.MODE === 'production';

// Por agora, manter apenas console logs até os tipos serem regenerados
export const log = (...args: any[]) => { 
  if (!isProd) console.log(...args);
  // TODO: Adicionar persistência quando tipos forem regenerados
};

export const warn = (...args: any[]) => { 
  if (!isProd) console.warn(...args);
};

export const error = (...args: any[]) => {
  console.error(...args); // sempre loga erro
};

// Função específica para logs de auditoria importantes
export const audit = (action: string, entity_type: string, meta?: any) => {
  if (!isProd) console.log(`[AUDIT] ${action} em ${entity_type}`, meta);
};