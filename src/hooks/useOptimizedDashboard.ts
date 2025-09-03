// Dashboard otimizado com memoização e cálculos eficientes
import { useMemo } from 'react';
import { useAllNFs } from './useNFs';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';

export interface OptimizedDashboardStats {
  totalNFs: number;
  nfsArmazenadas: number;
  nfsSolicitadas: number;
  nfsConfirmadas: number;
  totalPeso: number;
  totalVolume: number;
  statusDistribution: Record<string, number>;
  recentActivity: Array<{
    id: string;
    numero_nf: string;
    produto: string;
    status: string;
    created_at: string;
  }>;
}

export function useOptimizedDashboard() {
  const { armazenadas, solicitadas, confirmadas, isLoading, isError } = useAllNFs();
  const { user } = useAuth();

  // Memoizar cálculos pesados
  const dashboardStats = useMemo((): OptimizedDashboardStats => {
    // Cálculos básicos
    const nfsArmazenadas = armazenadas.length;
    const nfsSolicitadas = solicitadas.length;
    const nfsConfirmadas = confirmadas.length;
    const totalNFs = nfsArmazenadas;

    // Cálculos de peso e volume otimizados
    let totalPeso = 0;
    let totalVolume = 0;
    
    for (const nf of armazenadas) {
      const peso = Number(nf.peso);
      const volume = Number(nf.volume);
      if (!isNaN(peso)) totalPeso += peso;
      if (!isNaN(volume)) totalVolume += volume;
    }

    // Distribuição de status
    const statusDistribution = {
      ARMAZENADA: nfsArmazenadas,
      SOLICITADA: nfsSolicitadas,
      CONFIRMADA: nfsConfirmadas
    };

    // Atividade recente otimizada
    const allNFs = [...armazenadas, ...solicitadas, ...confirmadas];
    const recentActivity = allNFs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(nf => ({
        id: nf.id,
        numero_nf: nf.numero_nf,
        produto: nf.produto,
        status: nf.status,
        created_at: nf.created_at
      }));

    return {
      totalNFs,
      nfsArmazenadas,
      nfsSolicitadas,
      nfsConfirmadas,
      totalPeso,
      totalVolume,
      statusDistribution,
      recentActivity
    };
  }, [armazenadas, solicitadas, confirmadas]);

  return {
    ...dashboardStats,
    isLoading,
    isError,
    // Funções utilitárias
    getStatusCount: (status: string) => dashboardStats.statusDistribution[status] || 0,
    hasData: dashboardStats.totalNFs > 0 || dashboardStats.nfsSolicitadas > 0 || dashboardStats.nfsConfirmadas > 0
  };
}