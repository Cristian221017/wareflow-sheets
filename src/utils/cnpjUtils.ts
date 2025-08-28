/**
 * Utilitários para normalização e validação de CNPJ
 */

/**
 * Normaliza CNPJ removendo todos os caracteres não numéricos
 */
export const normalizeCNPJ = (cnpj: string): string => {
  return cnpj.replace(/\D/g, '');
};

/**
 * Formata CNPJ com máscara
 */
export const formatCNPJ = (cnpj: string): string => {
  const normalized = normalizeCNPJ(cnpj);
  if (normalized.length !== 14) return cnpj;
  
  return normalized.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  );
};

/**
 * Valida se CNPJ está no formato correto (apenas números)
 */
export const isValidCNPJFormat = (cnpj: string): boolean => {
  const normalized = normalizeCNPJ(cnpj);
  return normalized.length === 14 && /^\d+$/.test(normalized);
};