import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/auth';

interface Cliente {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  razao_social: string;
  transportadora_id: string;
}

export function useClientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClientes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user has transportadora
      if (!user || user.type !== 'transportadora') {
        setClientes([]);
        return;
      }

      // Use direct query instead of RPC for now
      const { data: clientesData, error: queryError } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj, email, transportadora_id')
        .eq('transportadora_id', user.transportadoraId)
        .eq('status', 'ativo')
        .order('razao_social');

      if (queryError) {
        console.error('Query Error:', queryError);
        setError('Erro ao carregar clientes: ' + queryError.message);
        return;
      }

      const transformedClientes = (clientesData || []).map(c => ({
        id: c.id,
        name: c.razao_social,
        cnpj: c.cnpj,
        email: c.email,
        razao_social: c.razao_social,
        transportadora_id: c.transportadora_id
      }));

      setClientes(transformedClientes);

    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setError('Erro inesperado ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClientes();
    } else {
      setClientes([]);
      setLoading(false);
    }
  }, [user?.id, user?.transportadoraId]);

  return {
    clientes,
    loading,
    error,
    refetch: loadClientes
  };
}