import { createSuperAdmin } from './createSuperAdmin';

// Funções de debug disponíveis no console
export const debugUtils = {
  createSuperAdmin,
};

// Disponibilizar no window para acesso via console
if (typeof window !== 'undefined') {
  (window as any).debugUtils = debugUtils;
}