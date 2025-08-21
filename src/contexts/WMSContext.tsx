import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotaFiscal, PedidoLiberacao, PedidoLiberado } from '@/types/wms';
import { notificationService } from '@/utils/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WMSContextType {
  notasFiscais: NotaFiscal[];
  pedidosLiberacao: PedidoLiberacao[];
  pedidosLiberados: PedidoLiberado[];
  loading: boolean;
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<void>;
  deleteNotaFiscal: (id: string) => Promise<void>;
  deletePedidoLiberacao: (id: string) => Promise<void>;
  deletePedidoLiberado: (id: string) => Promise<void>;
  addPedidoLiberacao: (pedido: Omit<PedidoLiberacao, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  liberarPedido: (pedidoId: string, transportadora: string, dataExpedicao?: string) => Promise<void>;
  updateNotaFiscalStatus: (nfId: string, status: NotaFiscal['status']) => Promise<void>;
  loadData: () => Promise<void>;
}

const WMSContext = createContext<WMSContextType | undefined>(undefined);

export function WMSProvider({ children }: { children: React.ReactNode }) {
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [pedidosLiberacao, setPedidosLiberacao] = useState<PedidoLiberacao[]>([]);
  const [pedidosLiberados, setPedidosLiberados] = useState<PedidoLiberado[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, clientes } = useAuth();

  // Load data when user changes or component mounts
  useEffect(() => {
    if (user?.transportadoraId) {
      loadData();
    }
  }, [user?.transportadoraId]);

  const loadData = async () => {
    if (!user?.transportadoraId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadNotasFiscais(),
        loadPedidosLiberacao(),
        loadPedidosLiberados()
      ]);
    } catch (error) {
      console.error('Error loading WMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotasFiscais = async () => {
    if (!user?.transportadoraId) return;

    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('transportadora_id', user.transportadoraId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all unique cliente_ids
      const clienteIds = [...new Set(data?.map(nf => nf.cliente_id).filter(Boolean))];
      
      // Fetch clientes data
      let clientesData: any[] = [];
      if (clienteIds.length > 0) {
        const { data: clientesResult } = await supabase
          .from('clientes')
          .select('id, razao_social, cnpj')
          .in('id', clienteIds);
        clientesData = clientesResult || [];
      }

      const formattedData: NotaFiscal[] = data?.map(nf => {
        const cliente = clientesData.find(c => c.id === nf.cliente_id);
        return {
          id: nf.id,
          numeroNF: nf.numero_nf,
          numeroPedido: nf.numero_pedido,
          ordemCompra: nf.ordem_compra,
          dataRecebimento: nf.data_recebimento,
          fornecedor: nf.fornecedor,
          cnpj: nf.cnpj_fornecedor,
          cliente: cliente?.razao_social || '',
          cnpjCliente: cliente?.cnpj || '',
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: Number(nf.peso),
          volume: Number(nf.volume),
          localizacao: nf.localizacao,
          status: nf.status as NotaFiscal['status'],
          createdAt: nf.created_at
        };
      }) || [];

      setNotasFiscais(formattedData);
    } catch (error) {
      console.error('Error loading notas fiscais:', error);
    }
  };

  const loadPedidosLiberacao = async () => {
    if (!user?.transportadoraId) return;

    try {
      const { data, error } = await supabase
        .from('pedidos_liberacao')
        .select('*')
        .eq('transportadora_id', user.transportadoraId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all unique cliente_ids and nota_fiscal_ids
      const clienteIds = [...new Set(data?.map(pl => pl.cliente_id).filter(Boolean))];
      const nfIds = [...new Set(data?.map(pl => pl.nota_fiscal_id).filter(Boolean))];
      
      // Fetch related data
      let clientesData: any[] = [];
      let nfsData: any[] = [];
      
      if (clienteIds.length > 0) {
        const { data: clientesResult } = await supabase
          .from('clientes')
          .select('id, razao_social, cnpj')
          .in('id', clienteIds);
        clientesData = clientesResult || [];
      }

      if (nfIds.length > 0) {
        const { data: nfsResult } = await supabase
          .from('notas_fiscais')
          .select('id, numero_nf')
          .in('id', nfIds);
        nfsData = nfsResult || [];
      }

      const formattedData: PedidoLiberacao[] = data?.map(pl => {
        const cliente = clientesData.find(c => c.id === pl.cliente_id);
        const nf = nfsData.find(n => n.id === pl.nota_fiscal_id);
        return {
          id: pl.id,
          numeroPedido: pl.numero_pedido,
          ordemCompra: pl.ordem_compra,
          dataSolicitacao: pl.data_solicitacao,
          cliente: cliente?.razao_social || '',
          cnpjCliente: cliente?.cnpj || '',
          nfVinculada: nf?.numero_nf || '',
          produto: pl.produto,
          quantidade: pl.quantidade,
          peso: Number(pl.peso),
          volume: Number(pl.volume),
          prioridade: pl.prioridade as PedidoLiberacao['prioridade'],
          responsavel: pl.responsavel,
          status: pl.status as PedidoLiberacao['status'],
          createdAt: pl.created_at
        };
      }) || [];

      setPedidosLiberacao(formattedData);
    } catch (error) {
      console.error('Error loading pedidos liberacao:', error);
    }
  };

  const loadPedidosLiberados = async () => {
    if (!user?.transportadoraId) return;

    try {
      const { data, error } = await supabase
        .from('pedidos_liberados')
        .select('*')
        .eq('transportadora_id', user.transportadoraId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all unique cliente_ids and nota_fiscal_ids
      const clienteIds = [...new Set(data?.map(pl => pl.cliente_id).filter(Boolean))];
      const nfIds = [...new Set(data?.map(pl => pl.nota_fiscal_id).filter(Boolean))];
      
      // Fetch related data
      let clientesData: any[] = [];
      let nfsData: any[] = [];
      
      if (clienteIds.length > 0) {
        const { data: clientesResult } = await supabase
          .from('clientes')
          .select('id, razao_social')
          .in('id', clienteIds);
        clientesData = clientesResult || [];
      }

      if (nfIds.length > 0) {
        const { data: nfsResult } = await supabase
          .from('notas_fiscais')
          .select('id, numero_nf')
          .in('id', nfIds);
        nfsData = nfsResult || [];
      }

      const formattedData: PedidoLiberado[] = data?.map(pl => {
        const cliente = clientesData.find(c => c.id === pl.cliente_id);
        const nf = nfsData.find(n => n.id === pl.nota_fiscal_id);
        return {
          id: pl.id,
          numeroPedido: pl.numero_pedido,
          ordemCompra: pl.ordem_compra,
          dataLiberacao: pl.data_liberacao,
          cliente: cliente?.razao_social || '',
          nfVinculada: nf?.numero_nf || '',
          quantidade: pl.quantidade,
          peso: Number(pl.peso),
          volume: Number(pl.volume),
          transportadora: pl.transportadora_responsavel,
          dataExpedicao: pl.data_expedicao,
          createdAt: pl.created_at
        };
      }) || [];

      setPedidosLiberados(formattedData);
    } catch (error) {
      console.error('Error loading pedidos liberados:', error);
    }
  };

  const addNotaFiscal = async (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    console.log('addNotaFiscal - User:', user);
    console.log('addNotaFiscal - Clientes disponíveis:', clientes);
    console.log('addNotaFiscal - NF data:', nf);
    
    if (!user?.transportadoraId) {
      console.error('Usuário não tem transportadoraId:', user);
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      // Find cliente by ID directly
      const cliente = clientes.find(c => c.id === nf.clienteId);
      console.log('Cliente encontrado:', cliente);
      if (!cliente) {
        console.error('Cliente não encontrado. ID procurado:', nf.clienteId, 'Clientes disponíveis:', clientes.map(c => ({ id: c.id, name: c.name })));
        throw new Error('Cliente não encontrado');
      }

      const { error } = await supabase
        .from('notas_fiscais')
        .insert([{
          transportadora_id: user.transportadoraId,
          cliente_id: cliente.id,
          numero_nf: nf.numeroNF,
          numero_pedido: nf.numeroPedido,
          ordem_compra: nf.ordemCompra,
          data_recebimento: nf.dataRecebimento,
          fornecedor: nf.fornecedor,
          cnpj_fornecedor: nf.cnpj,
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: nf.peso,
          volume: nf.volume,
          localizacao: nf.localizacao,
          status: nf.status
        }]);

      if (error) {
        console.error('Erro ao inserir NF no Supabase:', error);
        throw error;
      }

      console.log('NF inserida com sucesso, recarregando dados...');
      // Reload data to get the new record
      await loadNotasFiscais();

      // Enviar notificação de rastreabilidade
      if (cliente?.emailNotaFiscal) {
        notificationService.enviarNotificacaoNFCadastrada(
          cliente.emailNotaFiscal,
          nf.numeroNF,
          nf.cliente
        );
      }
    } catch (error) {
      console.error('Error adding nota fiscal:', error);
      throw error;
    }
  };

  const deleteNotaFiscal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir nota fiscal:', error);
        throw new Error('Erro ao excluir nota fiscal');
      }

      await loadNotasFiscais();
      toast.success('Nota fiscal excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir nota fiscal:', error);
      throw error;
    }
  };

  const deletePedidoLiberacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
      toast.success('Pedido de liberação excluído com sucesso');
    } catch (error) {
      console.error('Error deleting pedido liberacao:', error);
      toast.error('Erro ao excluir pedido de liberação');
      throw error;
    }
  };

  const deletePedidoLiberado = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pedidos_liberados')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
      toast.success('Pedido liberado excluído com sucesso');
    } catch (error) {
      console.error('Error deleting pedido liberado:', error);
      toast.error('Erro ao excluir pedido liberado');
      throw error;
    }
  };

  const addPedidoLiberacao = async (pedido: Omit<PedidoLiberacao, 'id' | 'createdAt' | 'status'>) => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      // Find cliente and nota fiscal
      const cliente = clientes.find(c => c.name === pedido.cliente);
      const notaFiscal = notasFiscais.find(nf => nf.numeroNF === pedido.nfVinculada);
      
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }
      if (!notaFiscal) {
        throw new Error('Nota fiscal não encontrada');
      }

      const { error } = await supabase
        .from('pedidos_liberacao')
        .insert([{
          transportadora_id: user.transportadoraId,
          cliente_id: cliente.id,
          nota_fiscal_id: notaFiscal.id,
          numero_pedido: pedido.numeroPedido,
          ordem_compra: pedido.ordemCompra,
          data_solicitacao: pedido.dataSolicitacao,
          produto: pedido.produto,
          quantidade: pedido.quantidade,
          peso: pedido.peso,
          volume: pedido.volume,
          prioridade: pedido.prioridade,
          responsavel: pedido.responsavel,
          status: 'Em análise'
        }]);

      if (error) throw error;

      // Update nota fiscal status
      await updateNotaFiscalStatus(notaFiscal.id, 'Ordem Solicitada');
      
      // Reload data
      await loadPedidosLiberacao();

      // Enviar notificação de rastreabilidade
      if (cliente?.emailSolicitacaoLiberacao) {
        notificationService.enviarNotificacaoSolicitacaoCarregamento(
          cliente.emailSolicitacaoLiberacao,
          pedido.numeroPedido,
          pedido.cliente
        );
      }
    } catch (error) {
      console.error('Error adding pedido liberacao:', error);
      throw error;
    }
  };

  const liberarPedido = async (pedidoId: string, transportadora: string, dataExpedicao?: string) => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      const pedido = pedidosLiberacao.find(p => p.id === pedidoId);
      if (!pedido) {
        throw new Error('Pedido não encontrado');
      }

      // Find related records
      const cliente = clientes.find(c => c.name === pedido.cliente);
      const notaFiscal = notasFiscais.find(nf => nf.numeroNF === pedido.nfVinculada);
      
      if (!cliente || !notaFiscal) {
        throw new Error('Cliente ou nota fiscal não encontrado');
      }

      // Create liberado record
      const { error: insertError } = await supabase
        .from('pedidos_liberados')
        .insert([{
          transportadora_id: user.transportadoraId,
          cliente_id: cliente.id,
          nota_fiscal_id: notaFiscal.id,
          pedido_liberacao_id: pedidoId,
          numero_pedido: pedido.numeroPedido,
          ordem_compra: pedido.ordemCompra,
          data_liberacao: new Date().toISOString().split('T')[0],
          quantidade: pedido.quantidade,
          peso: pedido.peso,
          volume: pedido.volume,
          transportadora_responsavel: transportadora,
          data_expedicao: dataExpedicao
        }]);

      if (insertError) throw insertError;

      // Delete from pedidos_liberacao
      const { error: deleteError } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('id', pedidoId);

      if (deleteError) throw deleteError;

      // Update NF status
      await updateNotaFiscalStatus(notaFiscal.id, 'Solicitação Confirmada');

      // Reload data
      await Promise.all([
        loadPedidosLiberacao(),
        loadPedidosLiberados()
      ]);

      // Enviar notificação de rastreabilidade
      if (cliente?.emailLiberacaoAutorizada) {
        notificationService.enviarNotificacaoConfirmacaoAutorizada(
          cliente.emailLiberacaoAutorizada,
          pedido.numeroPedido,
          transportadora
        );
      }
    } catch (error) {
      console.error('Error liberating pedido:', error);
      throw error;
    }
  };

  const updateNotaFiscalStatus = async (nfId: string, status: NotaFiscal['status']) => {
    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .update({ status })
        .eq('id', nfId);

      if (error) throw error;

      // Update local state
      setNotasFiscais(prev => 
        prev.map(nf => nf.id === nfId ? { ...nf, status } : nf)
      );
    } catch (error) {
      console.error('Error updating nota fiscal status:', error);
      throw error;
    }
  };

  return (
    <WMSContext.Provider value={{
      notasFiscais,
      pedidosLiberacao,
      pedidosLiberados,
      loading,
      addNotaFiscal,
      deleteNotaFiscal,
      deletePedidoLiberacao,
      deletePedidoLiberado,
      addPedidoLiberacao,
      liberarPedido,
      updateNotaFiscalStatus,
      loadData
    }}>
      {children}
    </WMSContext.Provider>
  );
}

export function useWMS() {
  const context = useContext(WMSContext);
  if (context === undefined) {
    throw new Error('useWMS must be used within a WMSProvider');
  }
  return context;
}