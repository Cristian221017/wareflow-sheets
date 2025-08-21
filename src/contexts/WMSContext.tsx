import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { NotaFiscal, PedidoLiberacao, PedidoLiberado } from '@/types/wms';
import { toast } from 'sonner';

interface WMSContextType {
  // Data
  notasFiscais: NotaFiscal[];
  pedidosLiberacao: PedidoLiberacao[];
  pedidosLiberados: PedidoLiberado[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions - New API
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<void>;
  solicitarCarregamento: (numeroNF: string) => Promise<void>;
  aprovarCarregamento: (numeroNF: string, transportadora: string) => Promise<void>;
  rejeitarCarregamento: (numeroNF: string, motivo: string) => Promise<void>;
  resetData: () => Promise<void>;
  
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
  const { user } = useAuth();
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [pedidosLiberacao, setPedidosLiberacao] = useState<PedidoLiberacao[]>([]);
  const [pedidosLiberados, setPedidosLiberados] = useState<PedidoLiberado[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load Notas Fiscais
      const { data: nfs } = await supabase
        .from('notas_fiscais')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (nfs) {
        const transformedNFs: NotaFiscal[] = nfs.map(nf => ({
          id: nf.id,
          numeroNF: nf.numero_nf,
          numeroPedido: nf.numero_pedido,
          ordemCompra: nf.ordem_compra,
          dataRecebimento: nf.data_recebimento,
          fornecedor: nf.fornecedor,
          cnpj: nf.cnpj_fornecedor,
          clienteId: nf.cliente_id,
          cliente: '', // Will be populated from clientes table
          cnpjCliente: '', // Will be populated from clientes table
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: parseFloat(nf.peso.toString()),
          volume: parseFloat(nf.volume.toString()),
          localizacao: nf.localizacao,
          status: nf.status as 'Armazenada' | 'Ordem Solicitada' | 'Solicitação Confirmada',
          createdAt: nf.created_at,
          integration_metadata: (nf as any).integration_metadata || {}
        }));
        
        // Load cliente info for each NF
        for (const nf of transformedNFs) {
          if (nf.clienteId) {
            const { data: cliente } = await supabase
              .from('clientes')
              .select('razao_social, cnpj')
              .eq('id', nf.clienteId)
              .single();
            
            if (cliente) {
              nf.cliente = cliente.razao_social;
              nf.cnpjCliente = cliente.cnpj;
            }
          }
        }
        
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

    } catch (error) {
      console.error('❌ Erro ao carregar dados WMS:', error);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Nota Fiscal
  const addNotaFiscal = async (nfData: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    try {
      console.log('📦 Adicionando nova NF:', nfData);

      // Get cliente_id from cnpj
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('cnpj', nfData.cnpjCliente)
        .single();

      if (!cliente) {
        throw new Error('Cliente não encontrado');
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
          volume: nfData.volume,
          localizacao: nfData.localizacao,
          status: 'Armazenada',
          transportadora_id: user?.transportadoraId
        });

      if (error) throw error;
      
      toast.success('✅ Nota Fiscal cadastrada com sucesso!');
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao adicionar NF:', error);
      toast.error(error.message || 'Erro ao cadastrar Nota Fiscal');
      throw error;
    }
  };

  // Solicitar carregamento (Cliente)
  const solicitarCarregamento = async (numeroNF: string) => {
    try {
      console.log('🚚 Solicitando carregamento para NF:', numeroNF);

      const nf = notasFiscais.find(n => n.numeroNF === numeroNF);
      if (!nf) {
        throw new Error('Nota Fiscal não encontrada');
      }

      if (nf.status !== 'Armazenada') {
        throw new Error(`NF não pode ser solicitada. Status atual: ${nf.status}`);
      }

      // Update NF status to "Ordem Solicitada"
      const { error: nfError } = await supabase
        .from('notas_fiscais')
        .update({ 
          status: 'Ordem Solicitada',
          updated_at: new Date().toISOString()
        })
        .eq('numero_nf', numeroNF);

      if (nfError) throw nfError;

      // Create pedido_liberacao entry
      const { error: pedidoError } = await supabase
        .from('pedidos_liberacao')
        .insert({
          numero_pedido: nf.numeroPedido,
          ordem_compra: nf.ordemCompra,
          data_solicitacao: new Date().toISOString().split('T')[0],
          cliente_id: nf.clienteId,
          nota_fiscal_id: nf.id,
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: nf.peso,
          volume: nf.volume,
          prioridade: 'Média',
          responsavel: user?.name || 'Cliente',
          status: 'Em análise',
          transportadora_id: user?.transportadoraId
        });

      if (pedidoError) throw pedidoError;

      toast.success(`✅ Carregamento solicitado para NF ${numeroNF}!`);
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao solicitar carregamento:', error);
      toast.error(error.message || 'Erro ao solicitar carregamento');
      throw error;
    }
  };

  // Aprovar carregamento (Transportadora)
  const aprovarCarregamento = async (numeroNF: string, transportadora: string) => {
    try {
      console.log('✅ Aprovando carregamento para NF:', numeroNF);

      const nf = notasFiscais.find(n => n.numeroNF === numeroNF);
      if (!nf) {
        throw new Error('Nota Fiscal não encontrada');
      }

      if (nf.status !== 'Ordem Solicitada') {
        throw new Error(`NF não pode ser aprovada. Status atual: ${nf.status}`);
      }

      // Update NF status to "Solicitação Confirmada"
      const { error: nfError } = await supabase
        .from('notas_fiscais')
        .update({ 
          status: 'Solicitação Confirmada',
          updated_at: new Date().toISOString()
        })
        .eq('numero_nf', numeroNF);

      if (nfError) throw nfError;

      // Update pedido_liberacao status to "Confirmado"
      const { error: pedidoError } = await supabase
        .from('pedidos_liberacao')
        .update({ 
          status: 'Confirmado',
          updated_at: new Date().toISOString()
        })
        .eq('numero_pedido', nf.numeroPedido);

      if (pedidoError) throw pedidoError;

      // Create pedido_liberado entry
      const { error: liberadoError } = await supabase
        .from('pedidos_liberados')
        .insert({
          numero_pedido: nf.numeroPedido,
          ordem_compra: nf.ordemCompra,
          data_liberacao: new Date().toISOString().split('T')[0],
          cliente_id: nf.clienteId,
          nota_fiscal_id: nf.id,
          pedido_liberacao_id: '', // Will be populated if needed
          quantidade: nf.quantidade,
          peso: nf.peso,
          volume: nf.volume,
          transportadora_responsavel: transportadora,
          transportadora_id: user?.transportadoraId
        });

      if (liberadoError) throw liberadoError;

      toast.success(`✅ Carregamento aprovado para NF ${numeroNF}!`);
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao aprovar carregamento:', error);
      toast.error(error.message || 'Erro ao aprovar carregamento');
      throw error;
    }
  };

  // Rejeitar carregamento (Transportadora)
  const rejeitarCarregamento = async (numeroNF: string, motivo: string) => {
    try {
      console.log('❌ Rejeitando carregamento para NF:', numeroNF, 'Motivo:', motivo);

      const nf = notasFiscais.find(n => n.numeroNF === numeroNF);
      if (!nf) {
        throw new Error('Nota Fiscal não encontrada');
      }

      if (nf.status !== 'Ordem Solicitada') {
        throw new Error(`NF não pode ser rejeitada. Status atual: ${nf.status}`);
      }

      // Update NF status back to "Armazenada" with rejection reason
      const { error: nfError } = await supabase
        .from('notas_fiscais')
        .update({ 
          status: 'Armazenada',
          integration_metadata: { ...nf.integration_metadata, rejection_reason: motivo },
          updated_at: new Date().toISOString()
        })
        .eq('numero_nf', numeroNF);

      if (nfError) throw nfError;

      // Delete the pedido_liberacao entry
      const { error: pedidoError } = await supabase
        .from('pedidos_liberacao')
        .delete()
        .eq('numero_pedido', nf.numeroPedido);

      if (pedidoError) throw pedidoError;

      toast.success(`❌ Carregamento rejeitado para NF ${numeroNF}!`);
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao rejeitar carregamento:', error);
      toast.error(error.message || 'Erro ao rejeitar carregamento');
      throw error;
    }
  };

  // Reset data (for testing)
  const resetData = async () => {
    try {
      console.log('🔄 Resetando dados de teste...');

      // Delete in correct order due to foreign keys
      await supabase.from('pedidos_liberados').delete().neq('id', '');
      await supabase.from('pedidos_liberacao').delete().neq('id', '');
      await supabase.from('notas_fiscais').delete().neq('id', '');

      // Create demo data
      const demoCliente = {
        razao_social: 'Empresa Demo Ltda',
        nome_fantasia: 'Demo Corp',
        cnpj: '12.345.678/0001-90',
        email: 'contato@demo.com',
        telefone: '(11) 99999-9999',
        endereco: 'Rua Demo, 123',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
        transportadora_id: user?.transportadoraId
      };

      const { data: clienteData } = await supabase
        .from('clientes')
        .insert(demoCliente)
        .select()
        .single();

      if (clienteData) {
        // Create demo NFs
        const demoNFs = [
          {
            numero_nf: 'NF-001',
            numero_pedido: 'PED-001',
            ordem_compra: 'OC-001',
            data_recebimento: new Date().toISOString().split('T')[0],
            fornecedor: 'Fornecedor A',
            cnpj_fornecedor: '98.765.432/0001-10',
            cliente_id: clienteData.id,
            produto: 'Produto Demo A',
            quantidade: 100,
            peso: 150.5,
            volume: 2.3,
            localizacao: 'A1-B2-C3',
            status: 'Armazenada',
            transportadora_id: user?.transportadoraId
          },
          {
            numero_nf: 'NF-002',
            numero_pedido: 'PED-002',
            ordem_compra: 'OC-002',
            data_recebimento: new Date().toISOString().split('T')[0],
            fornecedor: 'Fornecedor B',
            cnpj_fornecedor: '11.222.333/0001-44',
            cliente_id: clienteData.id,
            produto: 'Produto Demo B',
            quantidade: 50,
            peso: 75.2,
            volume: 1.8,
            localizacao: 'B1-C2-D3',
            status: 'Armazenada',
            transportadora_id: user?.transportadoraId
          }
        ];

        await supabase.from('notas_fiscais').insert(demoNFs);
      }

      toast.success('✅ Dados resetados com sucesso!');
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao resetar dados:', error);
      toast.error(error.message || 'Erro ao resetar dados');
      throw error;
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
    await solicitarCarregamento(data.nfVinculada || data.numeroNF);
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
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir NF:', error);
      toast.error(error.message || 'Erro ao excluir Nota Fiscal');
      throw error;
    }
  };

  const liberarPedido = async (numeroNF: string, transportadora: string, dataExpedicao?: string) => {
    // Convert to new API call
    await aprovarCarregamento(numeroNF, transportadora);
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
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir pedido:', error);
      toast.error(error.message || 'Erro ao excluir pedido');
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
      
      toast.success('Pedido liberado excluído com sucesso');
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir pedido liberado:', error);
      toast.error(error.message || 'Erro ao excluir pedido liberado');
      throw error;
    }
  };

  const recusarPedido = async (numeroNF: string, motivo: string, responsavel?: string) => {
    // Convert to new API call
    await rejeitarCarregamento(numeroNF, motivo);
  };

  const value: WMSContextType = {
    notasFiscais,
    pedidosLiberacao,
    pedidosLiberados,
    isLoading,
    addNotaFiscal,
    solicitarCarregamento,
    aprovarCarregamento,
    rejeitarCarregamento,
    resetData,
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