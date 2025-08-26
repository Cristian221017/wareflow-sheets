const isProd = import.meta.env.MODE === 'production';

export const log = (...args: any[]) => { if (!isProd) console.log(...args); };
export const warn = (...args: any[]) => { if (!isProd) console.warn(...args); };
export const error = (...args: any[]) => console.error(...args); // sempre loga erro