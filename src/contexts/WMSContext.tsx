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
  recusarPedido: (pedidoId: string, responsavel: string, motivo: string) => Promise<void>;
  updateNotaFiscalStatus: (nfId: string, status: NotaFiscal['status'], metadata?: any) => Promise<void>;
  loadData: () => Promise<void>;
  resetarDados: () => Promise<void>;
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
      
      // Create separate channels without complex filters to avoid CHANNEL_ERROR
      const notasChannel = supabase
        .channel('notas_fiscais_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notas_fiscais'
          },
          (payload) => {
            console.log('📦 NF Real-time update:', payload);
            // Only reload if it affects our transportadora
            if ((payload.new as any)?.transportadora_id === user.transportadoraId || 
                (payload.old as any)?.transportadora_id === user.transportadoraId) {
              setTimeout(() => loadNotasFiscais(), 300);
            }
          }
        )
        .subscribe((status) => {
          console.log('🔄 Notas Fiscais Channel Status:', status);
        });

      const pedidosChannel = supabase
        .channel('pedidos_liberacao_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pedidos_liberacao'
          },
          (payload) => {
            console.log('🚛 Pedido liberacao Real-time update:', payload);
            if ((payload.new as any)?.transportadora_id === user.transportadoraId || 
                (payload.old as any)?.transportadora_id === user.transportadoraId) {
              setTimeout(() => loadPedidosLiberacao(), 300);
            }
          }
        )
        .subscribe((status) => {
          console.log('🔄 Pedidos Liberacao Channel Status:', status);
        });

      const liberadosChannel = supabase
        .channel('pedidos_liberados_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pedidos_liberados'
          },
          (payload) => {
            console.log('✅ Pedido liberado Real-time update:', payload);
            if ((payload.new as any)?.transportadora_id === user.transportadoraId || 
                (payload.old as any)?.transportadora_id === user.transportadoraId) {
              setTimeout(() => loadPedidosLiberados(), 300);
            }
          }
        )
        .subscribe((status) => {
          console.log('🔄 Pedidos Liberados Channel Status:', status);
        });
      
      return () => {
        console.log('🔌 Removing WMS real-time channels');
        supabase.removeChannel(notasChannel);
        supabase.removeChannel(pedidosChannel);
        supabase.removeChannel(liberadosChannel);
      };
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
      console.log('🚀 INICIANDO SOLICITAÇÃO DE CARREGAMENTO:', pedido);
      console.log('🔍 Total de NFs disponíveis:', notasFiscais.length);
      console.log('🔍 Total de clientes disponíveis:', clientes.length);
      
      // Find cliente and nota fiscal
      const cliente = clientes.find(c => c.name === pedido.cliente);
      const notaFiscal = notasFiscais.find(nf => nf.numeroNF === pedido.nfVinculada);
      
      console.log('📊 Estado atual:');
      console.log('  - Cliente encontrado:', cliente?.id, cliente?.name);
      console.log('  - NF encontrada:', notaFiscal?.id, notaFiscal?.numeroNF);
      console.log('  - Status atual da NF:', notaFiscal?.status);
      console.log('  - Pedidos liberação existentes:', pedidosLiberacao.length);
      
      if (!cliente) {
        console.error('❌ Cliente não encontrado. Nome procurado:', pedido.cliente);
        console.error('❌ Clientes disponíveis:', clientes.map(c => c.name));
        throw new Error('Cliente não encontrado');
      }
      if (!notaFiscal) {
        console.error('❌ NF não encontrada. Número procurado:', pedido.nfVinculada);
        console.error('❌ NFs disponíveis:', notasFiscais.map(nf => nf.numeroNF));
        throw new Error('Nota fiscal não encontrada');
      }

      // Verificar se já existe pedido de liberação para esta NF
      const existingSolicitation = pedidosLiberacao.find(p => p.nfVinculada === notaFiscal.numeroNF);
      if (existingSolicitation) {
        console.error('❌ Já existe solicitação para esta NF:', existingSolicitation.id);
        throw new Error('Já existe uma solicitação de carregamento para esta NF');
      }

      // Verificar se a NF já não está com status que impede nova solicitação
      if (notaFiscal.status !== 'Armazenada') {
        console.error('❌ Status da NF não permite solicitação. Status atual:', notaFiscal.status);
        throw new Error(`Não é possível solicitar carregamento. Status atual: ${notaFiscal.status}`);
      }

      console.log('✅ Todas as validações passaram!');
      console.log('📝 Dados para inserção no banco:', {
        transportadora_id: user.transportadoraId,
        cliente_id: cliente.id,
        nota_fiscal_id: notaFiscal.id,
        numero_pedido: pedido.numeroPedido,
        status: 'Em análise'
      });

      // Insert pedido_liberacao
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

      if (error) {
        console.error('❌ ERRO ao inserir pedido:', error);
        throw error;
      }

      console.log('✅ Pedido inserido no banco com sucesso');

      // CRITICAL: Update nota fiscal status to "Ordem Solicitada" 
      console.log('🔄 ATUALIZANDO STATUS DA NF de "' + notaFiscal.status + '" para "Ordem Solicitada"');
      console.log('🔄 ID da NF a ser atualizada:', notaFiscal.id);
      
      const { error: updateError, data: updateData } = await supabase
        .from('notas_fiscais')
        .update({ status: 'Ordem Solicitada' })
        .eq('id', notaFiscal.id)
        .select();

      if (updateError) {
        console.error('❌ ERRO CRÍTICO ao atualizar status da NF:', updateError);
        throw updateError;
      }

      console.log('✅ STATUS DA NF ATUALIZADO COM SUCESSO!');
      console.log('📄 Dados da atualização:', updateData);
      
      // Force immediate state update
      console.log('🔄 Forçando atualização imediata do estado local...');
      setNotasFiscais(prev => prev.map(nf => 
        nf.id === notaFiscal.id 
          ? { ...nf, status: 'Ordem Solicitada' }
          : nf
      ));
      
      // Force complete data reload for perfect synchronization
      console.log('🔄 Recarregando dados do servidor para sincronização...');
      await Promise.all([
        loadNotasFiscais(),
        loadPedidosLiberacao()
      ]);

      console.log('✅ FLUXO COMPLETO: NF movida de "Armazenada" para "Ordem Solicitada"');

      // Enviar notificação de rastreabilidade
      if (cliente?.emailSolicitacaoLiberacao) {
        notificationService.enviarNotificacaoSolicitacaoCarregamento(
          cliente.emailSolicitacaoLiberacao,
          pedido.numeroPedido,
          pedido.cliente
        );
      }
    } catch (error) {
      console.error('❌ ERRO NO FLUXO DE SOLICITAÇÃO:', error);
      throw error;
    }
  };

  const liberarPedido = async (pedidoId: string, transportadora: string, dataExpedicao?: string) => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      console.log('🚛 INICIANDO CONFIRMAÇÃO DE CARREGAMENTO:', { pedidoId, transportadora });
      
      const pedido = pedidosLiberacao.find(p => p.id === pedidoId);
      if (!pedido) {
        throw new Error('Pedido não encontrado');
      }

      // Find related records
      const cliente = clientes.find(c => c.name === pedido.cliente);
      const notaFiscal = notasFiscais.find(nf => nf.numeroNF === pedido.nfVinculada);
      
      console.log('📊 Estado atual - Pedido:', pedido.numeroPedido, '| NF:', notaFiscal?.numeroNF, '| Status atual:', notaFiscal?.status);
      
      if (!cliente || !notaFiscal) {
        throw new Error('Cliente ou nota fiscal não encontrado');
      }

      console.log('✅ Validações passaram - Criando pedido liberado...');

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

      console.log('✅ Pedido liberado criado no banco');

      // Delete from pedidos_liberacao
      const { error: deleteError } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('id', pedidoId);

      if (deleteError) throw deleteError;

      console.log('✅ Pedido liberação removido do banco');

      console.log('🔄 ATUALIZANDO STATUS DA NF para "Solicitação Confirmada":', notaFiscal.numeroNF);

      // Update NF status - CRITICAL: This moves NF to "Confirmadas"
      const { error: updateError } = await supabase
        .from('notas_fiscais')
        .update({ status: 'Solicitação Confirmada' })
        .eq('id', notaFiscal.id);

      if (updateError) {
        console.error('❌ ERRO CRÍTICO ao atualizar status da NF para confirmada:', updateError);
        throw updateError;
      }

      console.log('✅ STATUS DA NF ATUALIZADO COM SUCESSO para "Solicitação Confirmada"');

      // Force complete data reload for perfect sync between transporter and client
      console.log('🔄 Recarregando todos os dados para sincronização completa...');
      await Promise.all([
        loadNotasFiscais(),
        loadPedidosLiberacao(),
        loadPedidosLiberados()
      ]);

      console.log('✅ FLUXO COMPLETO: NF movida de "Ordem Solicitada" para "Solicitação Confirmada"');

      // Enviar notificação de rastreabilidade
      if (cliente?.emailLiberacaoAutorizada) {
        notificationService.enviarNotificacaoConfirmacaoAutorizada(
          cliente.emailLiberacaoAutorizada,
          pedido.numeroPedido,
          transportadora
        );
      }
    } catch (error) {
      console.error('❌ ERRO NO FLUXO DE CONFIRMAÇÃO:', error);
      throw error;
    }
  };

  const updateNotaFiscalStatus = async (nfId: string, status: NotaFiscal['status'], metadata?: any) => {
    try {
      console.log('Atualizando status da NF:', { nfId, status, metadata });
      
      const updateData: any = { status };
      if (metadata) {
        updateData.integration_metadata = metadata;
      }
      
      const { error } = await supabase
        .from('notas_fiscais')
        .update(updateData)
        .eq('id', nfId);

      if (error) {
        console.error('Erro no banco ao atualizar status:', error);
        throw error;
      }

      console.log('Status atualizado no banco com sucesso');

      // Update local state only
      setNotasFiscais(prev => {
        const updated = prev.map(nf => nf.id === nfId ? { ...nf, status, integration_metadata: metadata || nf.integration_metadata } : nf);
        console.log('Estado local atualizado:', updated.find(nf => nf.id === nfId));
        return updated;
      });
      
    } catch (error) {
      console.error('Error updating nota fiscal status:', error);
      throw error;
    }
  };

  const recusarPedido = async (pedidoId: string, responsavel: string, motivo: string) => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      console.log('❌ INICIANDO RECUSA DE CARREGAMENTO:', { pedidoId, responsavel, motivo });
      
      // Encontrar o pedido
      const pedido = pedidosLiberacao.find(p => p.id === pedidoId);
      if (!pedido) {
        throw new Error('Pedido não encontrado');
      }

      // Encontrar a nota fiscal associada
      const notaFiscal = notasFiscais.find(nf => nf.numeroNF === pedido.nfVinculada);
      if (!notaFiscal) {
        throw new Error('Nota fiscal não encontrada');
      }

      console.log('📊 Estado atual - Pedido:', pedido.numeroPedido, '| NF:', notaFiscal.numeroNF, '| Status atual:', notaFiscal.status);

      console.log('✅ Validações passaram - Removendo pedido do banco...');

      // Deletar o pedido de liberação
      const { error: deleteError } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('id', pedidoId);

      if (deleteError) throw deleteError;

      console.log('✅ Pedido removido do banco');

      console.log('🔄 VOLTANDO NF para "Armazenada" com observações da recusa:', notaFiscal.numeroNF);

      // Voltar NF para status "Armazenada" com observações da recusa - CRITICAL: Returns NF to "Armazenadas"
      const observacaoRecusa = `RECUSADO - Responsável: ${responsavel} | Motivo: ${motivo} | Data: ${new Date().toLocaleDateString('pt-BR')}`;
      
      const { error: updateError } = await supabase
        .from('notas_fiscais')
        .update({ 
          status: 'Armazenada',
          integration_metadata: { 
            ...notaFiscal.integration_metadata || {}, 
            observacao_recusa: observacaoRecusa 
          }
        })
        .eq('id', notaFiscal.id);

      if (updateError) {
        console.error('❌ ERRO CRÍTICO ao recusar pedido:', updateError);
        throw updateError;
      }

      console.log('✅ STATUS DA NF ATUALIZADO COM SUCESSO para "Armazenada" com observações');

      // Force complete data reload for perfect sync
      console.log('🔄 Recarregando dados para sincronização...');
      await Promise.all([
        loadNotasFiscais(),
        loadPedidosLiberacao()
      ]);

      console.log('✅ FLUXO COMPLETO: NF voltou de "Ordem Solicitada" para "Armazenada" com observações da recusa');

      // Enviar notificação para o cliente
      const cliente = clientes.find(c => c.name === pedido.cliente);
      if (cliente?.emailSolicitacaoLiberacao) {
        notificationService.enviarNotificacaoSolicitacaoCarregamento(
          cliente.emailSolicitacaoLiberacao,
          `Solicitação RECUSADA - ${pedido.numeroPedido}`,
          `Responsável: ${responsavel} | Motivo: ${motivo}`
        );
      }
    } catch (error) {
      console.error('❌ ERRO NO FLUXO DE RECUSA:', error);
      throw error;
    }
  };

  const resetarDados = async () => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não associado a uma transportadora');
    }

    try {
      console.log('Resetando todos os dados do sistema...');

      // Deletar em ordem para respeitar foreign keys
      const { error: deletePedidosLiberados } = await supabase
        .from('pedidos_liberados')
        .delete()
        .eq('transportadora_id', user.transportadoraId);
      
      if (deletePedidosLiberados) throw deletePedidosLiberados;

      const { error: deletePedidosLiberacao } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('transportadora_id', user.transportadoraId);
      
      if (deletePedidosLiberacao) throw deletePedidosLiberacao;

      const { error: deleteNotasFiscais } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('transportadora_id', user.transportadoraId);
      
      if (deleteNotasFiscais) throw deleteNotasFiscais;

      console.log('Dados resetados com sucesso!');

      // Reload data
      await loadData();
      
      toast.success('Todos os dados foram resetados com sucesso!');
    } catch (error) {
      console.error('Erro ao resetar dados:', error);
      toast.error('Erro ao resetar dados');
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
      recusarPedido,
      updateNotaFiscalStatus,
      loadData,
      resetarDados
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