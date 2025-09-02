// Simple logger for compatibility
export const log = (...args: any[]) => {
  if (import.meta.env.MODE === 'development') {
    console.log(...args);
  }
};

export const warn = (...args: any[]) => {
  if (import.meta.env.MODE === 'development') {
    console.warn(...args);
  }
};

export const error = (...args: any[]) => {
  if (import.meta.env.MODE === 'development') {
    console.error(...args);
  }
};

export const audit = (...args: any[]) => {
  if (import.meta.env.MODE === 'development') {
    console.log('[AUDIT]', ...args);
  }
};

export const auditError = (...args: any[]) => {
  if (import.meta.env.MODE === 'development') {
    console.error('[AUDIT ERROR]', ...args);
  }
};

export default { log, warn, error, audit, auditError };