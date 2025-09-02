// Simple production logger for compatibility
export const log = (...args: any[]) => {
  // Silent in production
};

export const warn = (...args: any[]) => {
  // Silent in production
};

export const error = (...args: any[]) => {
  // Silent in production
};

export const audit = (...args: any[]) => {
  // Silent in production
};

export const auditError = (...args: any[]) => {
  // Silent in production
};

export default { log, warn, error, audit, auditError };