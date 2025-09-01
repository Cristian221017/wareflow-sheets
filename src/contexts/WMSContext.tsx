import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { NotaFiscal, PedidoLiberacao, PedidoLiberado } from '@/types/wms';
import { toast } from 'sonner';
import { solicitarNF, confirmarNF, recusarNF } from "@/lib/nfApi";
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/utils/notificationService';
import { log, warn, error as logError, auditError } from '@/utils/optimizedLogger';

interface WMSContextType {
  // Data
  notasFiscais: NotaFiscal[];
  pedidosLiberacao: PedidoLiberacao[];
  pedidosLiberados: PedidoLiberado[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions - New API
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<void>;
  
  // Flow actions with RPCs
  solicitarCarregamento: (numeroNF: string) => Promise<void>;
  aprovarCarregamento: (numeroNF: string, transportadora: string) => Promise<void>;
  rejeitarCarregamento: (numeroNF: string, motivo: string) => Promise<void>;
  
  // Legacy API for compatibility
  addPedidoLiberacao: (data: any) => Promise<void>;
  deleteNotaFiscal: (id: string) => Promise<void>;
  liberarPedido: (numeroNF: string, transportadora: string, dataExpedicao?: string) => Promise<void>;
  deletePedidoLiberacao: (id: string) => Promise<void>;
  deletePedidoLiberado: (id: string) => Promise<void>;
  recusarPedido: (numeroNF: string, motivo: string, responsavel?: string) => Promise<void>;
}

const WMSContext = createContext<WMSContextType | undefined>(undefined);

export function WMSProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { user, loading } = auth;
  const queryClient = useQueryClient();
  
  // Aguardar auth terminar de carregar antes de inicializar WMS
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const invalidateWithScope = (entityType: 'nfs' | 'documentos_financeiros', entityId?: string, userType?: string, userId?: string) => {
    if (entityType === 'nfs') {
      // Invalidar queries com escopo por persona
      const scope = user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId;
      const statuses = ["ARMAZENADA", "SOLICITADA", "CONFIRMADA"];
      
      statuses.forEach(status => {
        // Queries antigas sem escopo (compatibilidade)
        queryClient.invalidateQueries({ queryKey: ["nfs", status] });
        // Queries com escopo por persona
        queryClient.invalidateQueries({ queryKey: ["nfs", status, user?.type, scope] });
      });
      
      // Invalidar queries do cliente (com chaves escopadas)
      queryClient.invalidateQueries({ queryKey: ['nfs', 'cliente', 'todas'] });
      statuses.forEach(status => 
        queryClient.invalidateQueries({ queryKey: ['nfs', 'cliente', status] })
      );
      
      // Invalidar transportadora se disponível
      if (user?.transportadoraId) {
        queryClient.invalidateQueries({ queryKey: ['nfs', 'transportadora', user.transportadoraId] });
      }
    } else if (entityType === 'documentos_financeiros') {
      if (userType === 'cliente' && user?.clienteId) {
        queryClient.invalidateQueries({ queryKey: ['documentos_financeiros', 'cliente', user.clienteId] });
      } else if (user?.transportadoraId) {
        queryClient.invalidateQueries({ queryKey: ['documentos_financeiros', 'transportadora', user.transportadoraId] });
      }
    }
  };
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [pedidosLiberacao, setPedidosLiberacao] = useState<PedidoLiberacao[]>([]);
  const [pedidosLiberados, setPedidosLiberados] = useState<PedidoLiberado[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load Notas Fiscais with JOIN to avoid N+1 queries
      const { data: nfs } = await supabase
        .from('notas_fiscais')
        .select(`
          *,
          clientes!inner(
            id,
            razao_social,
            cnpj
          )
        `)
        .order('created_at', { ascending: false });
      
      if (nfs) {
        const transformedNFs: NotaFiscal[] = nfs.map((nf: any) => ({
          id: nf.id,
          numeroNF: nf.numero_nf,
          numeroPedido: nf.numero_pedido,
          ordemCompra: nf.ordem_compra,
          dataRecebimento: nf.data_recebimento,
          fornecedor: nf.fornecedor,
          cnpj: nf.cnpj_fornecedor,
          clienteId: nf.cliente_id,
          cliente: nf.clientes.razao_social, // From JOIN - no more N+1!
          cnpjCliente: nf.clientes.cnpj,     // From JOIN - no more N+1!
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: Number(nf.peso) || 0,
          volume: Number(nf.volume) || 0,
          localizacao: nf.localizacao,
          status: nf.status as 'ARMAZENADA' | 'SOLICITADA' | 'CONFIRMADA',
          statusSeparacao: nf.status_separacao || 'pendente',
          createdAt: nf.created_at,
          integration_metadata: nf.integration_metadata || {}
        }));
        
        setNotasFiscais(transformedNFs);
      }

      // Load Pedidos Liberação
      const { data: pedidos } = await supabase
        .from('pedidos_liberacao')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (pedidos) {
        const transformedPedidos: PedidoLiberacao[] = pedidos.map(p => ({
          id: p.id,
          numeroPedido: p.numero_pedido,
          ordemCompra: p.ordem_compra,
          dataSolicitacao: p.data_solicitacao,
          cliente: '', // Will be populated
          cnpjCliente: '', // Will be populated
          nfVinculada: '', // Will be populated from NF
          produto: p.produto,
          quantidade: p.quantidade,
          peso: parseFloat(p.peso.toString()),
          volume: parseFloat(p.volume.toString()),
          prioridade: p.prioridade as 'Alta' | 'Média' | 'Baixa',
          responsavel: p.responsavel,
          status: p.status as 'Em análise' | 'Confirmado',
          createdAt: p.created_at
        }));
        
        setPedidosLiberacao(transformedPedidos);
      }

      // Load Pedidos Liberados
      const { data: liberados } = await supabase
        .from('pedidos_liberados')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (liberados) {
        const transformedLiberados: PedidoLiberado[] = liberados.map(l => ({
          id: l.id,
          numeroPedido: l.numero_pedido,
          ordemCompra: l.ordem_compra,
          dataLiberacao: l.data_liberacao,
          cliente: '', // Will be populated
          nfVinculada: '', // Will be populated from NF number
          quantidade: l.quantidade,
          peso: parseFloat(l.peso.toString()),
          volume: parseFloat(l.volume.toString()),
          transportadora: l.transportadora_responsavel,
          dataExpedicao: l.data_expedicao || undefined,
          createdAt: l.created_at
        }));
        
        setPedidosLiberados(transformedLiberados);
      }

    } catch (err) {
      logError('❌ Erro ao carregar dados WMS:', err);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Nota Fiscal
  const addNotaFiscal = async (nfData: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não tem transportadora associada');
    }

    try {
      log('📦 Adicionando nova NF:', nfData);

      // Priorizar clienteId se fornecido
      const clienteId = nfData.clienteId;
      if (!clienteId) {
        throw new Error('Cliente não selecionado');
      }

      // Validar cliente pelo ID
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id, transportadora_id, razao_social, cnpj')
        .eq('id', clienteId)
        .eq('transportadora_id', user.transportadoraId)
        .single();

      if (clienteError || !cliente) {
        throw new Error('Cliente inválido');
      }

      const { error } = await supabase
        .from('notas_fiscais')
        .insert({
          numero_nf: nfData.numeroNF,
          numero_pedido: nfData.numeroPedido,
          ordem_compra: nfData.ordemCompra,
          data_recebimento: nfData.dataRecebimento,
          fornecedor: nfData.fornecedor,
          cnpj_fornecedor: nfData.cnpj,
          cliente_id: cliente.id,
          produto: nfData.produto,
          quantidade: nfData.quantidade,
          peso: nfData.peso,
          volume: Number(nfData.volume) || 0, // Garantir que nunca seja null/undefined
          localizacao: nfData.localizacao || 'A definir',
          status: 'ARMAZENADA',
          status_separacao: nfData.statusSeparacao || 'pendente',
          transportadora_id: user?.transportadoraId
        });

      if (error) throw error;
      
      // Enviar notificação por email se houver email de NF configurado
      try {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('razao_social, email_nota_fiscal')
          .eq('id', cliente.id)
          .single();
        
        if (clienteData?.email_nota_fiscal) {
          await notificationService.enviarNotificacaoNFCadastrada(
            clienteData.email_nota_fiscal,
            nfData.numeroNF,
            clienteData.razao_social
          );
        }
        } catch (emailError) {
        warn('⚠️ Erro ao enviar notificação de NF:', emailError);
        }
      
      toast.success('✅ Nota Fiscal cadastrada com sucesso!');
      await loadData();
      
    } catch (err: any) {
      auditError('NF_CREATE_FAIL', 'NF', err, { 
        payload: { 
          numeroNF: nfData.numeroNF, 
          cnpjCliente: nfData.cnpjCliente?.replace(/(\d{5})\d+/, "$1***"),
          produto: nfData.produto 
        } 
      });
      const errorMessage = err?.message || 'Erro desconhecido ao cadastrar Nota Fiscal';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Solicitar carregamento (Cliente)
  const solicitarCarregamento = async (numeroNF: string) => {
    try {
      log('🚚 Solicitando carregamento para NF:', numeroNF);

      const nf = notasFiscais.find(n => n.numeroNF === numeroNF);
      if (!nf) {
        throw new Error('Nota Fiscal não encontrada');
      }

      if (nf.status !== 'ARMAZENADA') {
        throw new Error(`NF não pode ser solicitada. Status atual: ${nf.status}`);
      }

      if (nf.statusSeparacao !== 'separacao_concluida') {
        throw new Error('Só é possível solicitar carregamento quando a separação estiver concluída');
      }

      await solicitarNF(nf.id);
      
      // Enviar notificação de solicitação de carregamento
      try {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('razao_social, email_solicitacao_liberacao')
          .eq('id', nf.clienteId)
          .single();
        
        if (clienteData?.email_solicitacao_liberacao) {
          await notificationService.enviarNotificacaoSolicitacaoCarregamento(
            clienteData.email_solicitacao_liberacao,
            numeroNF,
            clienteData.razao_social
          );
        }
        } catch (emailError) {
        warn('⚠️ Erro ao enviar notificação de solicitação:', emailError);
        }
      
      // Invalidar com escopo otimizado para melhor responsividade
      queryClient.invalidateQueries({ queryKey: ['nfs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      invalidateWithScope('nfs', undefined, user?.type, user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId);
      await loadData();
      
    } catch (err: any) {
      logError('❌ Erro ao solicitar carregamento:', err);
      toast.error(err.message || 'Erro ao solicitar carregamento');
      throw err;
    }
  };

  // Aprovar carregamento (Transportadora)
  const aprovarCarregamento = async (numeroNF: string, transportadora: string) => {
    try {
      log('✅ Aprovando carregamento para NF:', numeroNF);

      const nf = notasFiscais.find(n => n.numeroNF === numeroNF);
      if (!nf) {
        throw new Error('Nota Fiscal não encontrada');
      }

      if (nf.status !== 'SOLICITADA') {
        throw new Error(`NF não pode ser aprovada. Status atual: ${nf.status}`);
      }

      await confirmarNF(nf.id);
      
      // Enviar notificação de confirmação autorizada
      try {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('razao_social, email_liberacao_autorizada')
          .eq('id', nf.clienteId)
          .single();
        
        if (clienteData?.email_liberacao_autorizada) {
          await notificationService.enviarNotificacaoConfirmacaoAutorizada(
            clienteData.email_liberacao_autorizada,
            numeroNF,
            transportadora
          );
        }
        } catch (emailError) {
        warn('⚠️ Erro ao enviar notificação de confirmação:', emailError);
        }
      
      // Invalidar com escopo
      invalidateWithScope('nfs', undefined, user?.type, user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId);
      toast.success(`✅ Carregamento aprovado para NF ${numeroNF}!`);
      await loadData();
      
    } catch (err: any) {
      logError('❌ Erro ao aprovar carregamento:', err);
      toast.error(err.message || 'Erro ao aprovar carregamento');
      throw err;
    }
  };

  // Rejeitar carregamento (Transportadora)
  const rejeitarCarregamento = async (numeroNF: string, motivo: string) => {
    try {
      log('❌ Rejeitando carregamento para NF:', numeroNF, 'Motivo:', motivo);

      const nf = notasFiscais.find(n => n.numeroNF === numeroNF);
      if (!nf) {
        throw new Error('Nota Fiscal não encontrada');
      }

      if (nf.status !== 'SOLICITADA') {
        throw new Error(`NF não pode ser rejeitada. Status atual: ${nf.status}`);
      }

      await recusarNF(nf.id);
      
      // Invalidar com escopo
      invalidateWithScope('nfs', undefined, user?.type, user?.type === 'cliente' ? user?.clienteId : user?.transportadoraId);
      toast.success(`❌ Carregamento rejeitado para NF ${numeroNF}!`);
      await loadData();
      
    } catch (err: any) {
      logError('❌ Erro ao rejeitar carregamento:', err);
      toast.error(err.message || 'Erro ao rejeitar carregamento');
      throw err;
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Legacy API functions for compatibility
  const addPedidoLiberacao = async (data: any) => {
    // Convert to new API call
    // Criar pedido de liberação sem alterar status da NF
  };

  const deleteNotaFiscal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Nota Fiscal excluída com sucesso');
      await loadData();
      
    } catch (err: any) {
      logError('❌ Erro ao excluir NF:', err);
      toast.error(err.message || 'Erro ao excluir Nota Fiscal');
      throw err;
    }
  };

  const liberarPedido = async (numeroNF: string, transportadora: string, dataExpedicao?: string) => {
    // Convert to new API call
    // Liberar pedido sem alterar status da NF
  };

  const deletePedidoLiberacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Pedido de liberação excluído com sucesso');
      await loadData();
      
    } catch (err: any) {
      logError('❌ Erro ao excluir pedido:', err);
      toast.error(err.message || 'Erro ao excluir pedido');
      throw err;
    }
  };

  const deletePedidoLiberado = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pedidos_liberados')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Pedido liberado excluído com sucesso');
      await loadData();
      
    } catch (err: any) {
      logError('❌ Erro ao excluir pedido liberado:', err);
      toast.error(err.message || 'Erro ao excluir pedido liberado');
      throw err;
    }
  };

  const recusarPedido = async (numeroNF: string, motivo: string, responsavel?: string) => {
    await rejeitarCarregamento(numeroNF, motivo);
  };

  const value: WMSContextType = {
    notasFiscais,
    pedidosLiberacao,
    pedidosLiberados,
    isLoading,
    addNotaFiscal,
    // Flow actions with RPCs
    solicitarCarregamento,
    aprovarCarregamento,
    rejeitarCarregamento,
    // Legacy API
    addPedidoLiberacao,
    deleteNotaFiscal,
    liberarPedido,
    deletePedidoLiberacao,
    deletePedidoLiberado,
    recusarPedido
  };

  return (
    <WMSContext.Provider value={value}>
      {children}
    </WMSContext.Provider>
  );
}

export const useWMS = () => {
  const context = useContext(WMSContext);
  if (context === undefined) {
    throw new Error('useWMS must be used within a WMSProvider');
  }
  return context;
};