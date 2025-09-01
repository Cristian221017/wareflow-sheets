import { useMemo } from 'react';
import { useAllNFs } from './useNFs';
import { useAuth } from '@/contexts/AuthContext';
import { NotaFiscal } from '@/types/nf';

export interface SLAMetrics {
  tempoMedioCadastroSeparacao: number; // em horas
  tempoMedioSeparacaoLiberacao: number; // em horas  
  tempoP90CadastroSeparacao: number; // percentil 90 em horas
  tempoP90SeparacaoLiberacao: number; // percentil 90 em horas
  tempoMaximoCadastroSeparacao: number; // em horas
  tempoMaximoSeparacaoLiberacao: number; // em horas
  totalNFsAnalisadas: number;
  nfsComSeparacao: number;
  nfsComLiberacao: number;
}

/**
 * Hook para calcular métricas de SLA baseado nos tempos de processamento
 */
export function useSLAMetrics() {
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();
  const { user } = useAuth();

  const metrics = useMemo((): SLAMetrics => {
    // Combinar todas as NFs
    const todasNFs = [
      ...(armazenadas || []),
      ...(solicitadas || []),
      ...(confirmadas || [])
    ] as NotaFiscal[];

    if (!todasNFs.length) {
      return {
        tempoMedioCadastroSeparacao: 0,
        tempoMedioSeparacaoLiberacao: 0,
        tempoP90CadastroSeparacao: 0,
        tempoP90SeparacaoLiberacao: 0,
        tempoMaximoCadastroSeparacao: 0,
        tempoMaximoSeparacaoLiberacao: 0,
        totalNFsAnalisadas: 0,
        nfsComSeparacao: 0,
        nfsComLiberacao: 0,
      };
    }

    // Calcular tempos de processamento
    const temposCadastroSeparacao: number[] = [];
    const temposSeparacaoLiberacao: number[] = [];

    todasNFs.forEach(nf => {
      const dataCadastro = new Date(nf.created_at);
      
      // Simular data de separação baseada no status_separacao
      // Em produção, isso viria de uma tabela de eventos ou logs
      let dataSeparacao: Date | null = null;
      if (nf.status_separacao === 'separacao_concluida' || nf.status === 'SOLICITADA' || nf.status === 'CONFIRMADA') {
        // Estimar baseado no updated_at se não temos dados específicos
        dataSeparacao = new Date(nf.updated_at);
      }

      // Data de liberação (quando foi solicitada pelo cliente)
      let dataLiberacao: Date | null = null;
      if (nf.requested_at) {
        dataLiberacao = new Date(nf.requested_at);
      }

      // Calcular tempo cadastro → separação
      if (dataSeparacao) {
        const tempoCadastroSeparacao = (dataSeparacao.getTime() - dataCadastro.getTime()) / (1000 * 60 * 60); // em horas
        if (tempoCadastroSeparacao >= 0) {
          temposCadastroSeparacao.push(tempoCadastroSeparacao);
        }
      }

      // Calcular tempo separação → liberação
      if (dataSeparacao && dataLiberacao && dataLiberacao > dataSeparacao) {
        const tempoSeparacaoLiberacao = (dataLiberacao.getTime() - dataSeparacao.getTime()) / (1000 * 60 * 60); // em horas
        if (tempoSeparacaoLiberacao >= 0) {
          temposSeparacaoLiberacao.push(tempoSeparacaoLiberacao);
        }
      }
    });

    // Calcular estatísticas
    const calcularEstatisticas = (tempos: number[]) => {
      if (!tempos.length) return { media: 0, p90: 0, maximo: 0 };
      
      tempos.sort((a, b) => a - b);
      
      const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      const p90Index = Math.ceil(tempos.length * 0.9) - 1;
      const p90 = tempos[p90Index] || 0;
      const maximo = Math.max(...tempos);
      
      return { media, p90, maximo };
    };

    const statsCadastroSeparacao = calcularEstatisticas(temposCadastroSeparacao);
    const statsSeparacaoLiberacao = calcularEstatisticas(temposSeparacaoLiberacao);

    return {
      tempoMedioCadastroSeparacao: Math.round(statsCadastroSeparacao.media * 10) / 10,
      tempoMedioSeparacaoLiberacao: Math.round(statsSeparacaoLiberacao.media * 10) / 10,
      tempoP90CadastroSeparacao: Math.round(statsCadastroSeparacao.p90 * 10) / 10,
      tempoP90SeparacaoLiberacao: Math.round(statsSeparacaoLiberacao.p90 * 10) / 10,
      tempoMaximoCadastroSeparacao: Math.round(statsCadastroSeparacao.maximo * 10) / 10,
      tempoMaximoSeparacaoLiberacao: Math.round(statsSeparacaoLiberacao.maximo * 10) / 10,
      totalNFsAnalisadas: todasNFs.length,
      nfsComSeparacao: temposCadastroSeparacao.length,
      nfsComLiberacao: temposSeparacaoLiberacao.length,
    };
  }, [armazenadas, solicitadas, confirmadas]);

  return metrics;
}

/**
 * Hook para calcular tendências de SLA ao longo do tempo
 */
export function useSLATrends(periodoEmDias: number = 30) {
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();

  const trends = useMemo(() => {
    const todasNFs = [
      ...(armazenadas || []),
      ...(solicitadas || []),
      ...(confirmadas || [])
    ] as NotaFiscal[];

    const agora = new Date();
    const dataInicio = new Date(agora.getTime() - periodoEmDias * 24 * 60 * 60 * 1000);

    // Filtrar NFs do período
    const nfsPeriodo = todasNFs.filter(nf => 
      new Date(nf.created_at) >= dataInicio
    );

    // Agrupar por semana
    const semanas: { [key: string]: NotaFiscal[] } = {};
    
    nfsPeriodo.forEach(nf => {
      const data = new Date(nf.created_at);
      const inicioSemana = new Date(data);
      inicioSemana.setDate(data.getDate() - data.getDay());
      const chave = inicioSemana.toISOString().split('T')[0];
      
      if (!semanas[chave]) {
        semanas[chave] = [];
      }
      semanas[chave].push(nf);
    });

    // Calcular métricas por semana
    const trendData = Object.entries(semanas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, nfs]) => {
        // Calcular tempo médio de processamento para esta semana
        let tempoMedio = 0;
        let nfsProcessadas = 0;

        nfs.forEach(nf => {
          if (nf.status !== 'ARMAZENADA') {
            const inicio = new Date(nf.created_at);
            const fim = new Date(nf.updated_at);
            const tempo = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
            
            if (tempo > 0) {
              tempoMedio += tempo;
              nfsProcessadas++;
            }
          }
        });

        tempoMedio = nfsProcessadas > 0 ? tempoMedio / nfsProcessadas : 0;

        return {
          semana,
          totalNFs: nfs.length,
          nfsProcessadas,
          tempoMedio: Math.round(tempoMedio * 10) / 10,
        };
      });

    return trendData;
  }, [armazenadas, solicitadas, confirmadas, periodoEmDias]);

  return trends;
}