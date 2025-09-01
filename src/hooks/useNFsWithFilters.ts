import { useMemo } from 'react';
import { useAllNFs } from './useNFs';
import { useNFsCliente } from './useNFsCliente';
import { useAuth } from '@/contexts/AuthContext';
import { NFStatus } from '@/types/nf';

export interface NFFilters {
  numeroNF?: string;
  status?: NFStatus;
  clienteNome?: string;
}

/**
 * Hook unificado para buscar NFs com filtros aplicados
 * Funciona para transportadoras e clientes
 */
export function useNFsWithFilters(filters: NFFilters = {}) {
  const { user } = useAuth();
  
  // Para transportadoras - usar useAllNFs
  const { armazenadas, solicitadas, confirmadas, isLoading: isLoadingTransportadora } = useAllNFs();
  
  // Para clientes - usar useNFsCliente (todas as NFs do cliente)
  const { data: nfsCliente = [], isLoading: isLoadingCliente } = useNFsCliente();

  const { nfsFiltradas, isLoading } = useMemo(() => {
    let allNFs: any[] = [];
    let loading = false;

    if (user?.type === 'cliente') {
      allNFs = nfsCliente;
      loading = isLoadingCliente;
    } else if (user?.type === 'transportadora' || user?.role) {
      // Combinar todas as NFs da transportadora
      allNFs = [
        ...(armazenadas || []),
        ...(solicitadas || []),
        ...(confirmadas || [])
      ];
      loading = isLoadingTransportadora;
    }

    // Aplicar filtros
    let filtered = allNFs;

    // Filtro por número da NF
    if (filters.numeroNF) {
      const numeroLower = filters.numeroNF.toLowerCase();
      filtered = filtered.filter(nf => 
        nf.numero_nf?.toLowerCase().includes(numeroLower)
      );
    }

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(nf => nf.status === filters.status);
    }

    // Filtro por nome do cliente (para transportadoras)
    if (filters.clienteNome && user?.type === 'transportadora') {
      const clienteLower = filters.clienteNome.toLowerCase();
      filtered = filtered.filter(nf => {
        // Buscar nos dados do cliente se disponível
        const clienteNome = nf.cliente?.razao_social || nf.cliente?.nome_fantasia || '';
        return clienteNome.toLowerCase().includes(clienteLower);
      });
    }

    return {
      nfsFiltradas: filtered,
      isLoading: loading
    };
  }, [
    user,
    nfsCliente,
    armazenadas,
    solicitadas, 
    confirmadas,
    isLoadingCliente,
    isLoadingTransportadora,
    filters.numeroNF,
    filters.status,
    filters.clienteNome
  ]);

  // Stats dos filtros aplicados
  const stats = useMemo(() => ({
    total: nfsFiltradas.length,
    armazenadas: nfsFiltradas.filter(nf => nf.status === 'ARMAZENADA').length,
    solicitadas: nfsFiltradas.filter(nf => nf.status === 'SOLICITADA').length,
    confirmadas: nfsFiltradas.filter(nf => nf.status === 'CONFIRMADA').length,
  }), [nfsFiltradas]);

  return {
    nfs: nfsFiltradas,
    isLoading,
    stats
  };
}

/**
 * Hook para fornecer opções de filtro baseadas nos dados existentes
 */
export function useNFFilterOptions() {
  const { user } = useAuth();
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();
  const { data: nfsCliente = [] } = useNFsCliente();

  const options = useMemo(() => {
    let allNFs: any[] = [];

    if (user?.type === 'cliente') {
      allNFs = nfsCliente;
    } else if (user?.type === 'transportadora' || user?.role) {
      allNFs = [
        ...(armazenadas || []),
        ...(solicitadas || []),
        ...(confirmadas || [])
      ];
    }

    // Extrair opções únicas
    const statusOptions = Array.from(new Set(allNFs.map(nf => nf.status))).filter(Boolean);
    
    const clienteOptions = user?.type === 'transportadora' 
      ? Array.from(new Set(
          allNFs
            .map(nf => nf.cliente?.razao_social || nf.cliente?.nome_fantasia)
            .filter(Boolean)
        ))
      : [];

    return {
      statusOptions,
      clienteOptions
    };
  }, [user, nfsCliente, armazenadas, solicitadas, confirmadas]);

  return options;
}