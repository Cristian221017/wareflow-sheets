/**
 * Formatar data para banco de dados (YYYY-MM-DD UTC consistente)
 * Aceita Date, string DD/MM/YYYY ou ISO string
 */
export const formatDateForDatabase = (input?: string | Date): string => {
  if (!input) return '';

  let d: Date;

  if (input instanceof Date) {
    d = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split('/').map(Number);
    d = new Date(Date.UTC(yyyy, mm - 1, dd));
  } else {
    const iso = input.length === 10 ? `${input}T00:00:00` : input;
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return '';
    d = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Verifica se uma data está vencida comparando com hoje
 */
export const isDateOverdue = (dateString: string, status: string): boolean => {
  if (!dateString || status !== 'Em aberto') return false;
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};