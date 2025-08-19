import { useMemo } from 'react';

export const useDateUtils = () => {
  return useMemo(() => ({
    // Converte string de input date para formato do banco (garante timezone correto)
    formatForDatabase: (dateString: string): string => {
      if (!dateString) return '';
      // Garante que a data seja interpretada como local, não UTC
      return dateString;
    },

    // Formata data do banco para exibição
    formatForDisplay: (dateString: string): string => {
      if (!dateString) return '';
      // Adiciona timezone para evitar problemas de interpretação
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR');
    },

    // Compara se uma data está vencida (considerando apenas a data, não horário)
    isOverdue: (dateString: string, status: string = ''): boolean => {
      if (!dateString || (status && status !== 'Em aberto')) return false;
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    },

    // Pega data atual no formato do input date
    getTodayForInput: (): string => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    },

    // Calcula diferença em dias entre duas datas
    getDaysDifference: (startDate: string, endDate: string): number => {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      const diffTime = end.getTime() - start.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    // Verifica se uma data é válida
    isValidDate: (dateString: string): boolean => {
      if (!dateString) return false;
      const date = new Date(dateString + 'T00:00:00');
      return !isNaN(date.getTime());
    },

    // Formata data para relatórios (com horário se necessário)
    formatForReport: (dateString: string, includeTime: boolean = false): string => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (includeTime) {
        return date.toLocaleString('pt-BR');
      }
      return date.toLocaleDateString('pt-BR');
    }
  }), []);
};