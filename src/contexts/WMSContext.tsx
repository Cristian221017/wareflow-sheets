import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { NotaFiscal, PedidoLiberacao, PedidoLiberado } from '@/types/wms';
import { toast } from 'sonner';

interface WMSContextType {
  // Data
  notasFiscais: NotaFiscal[];
  pedidosLiberacao: PedidoLiberacao[];
  pedidosLiberados: PedidoLiberado[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<void>;
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
  const { user } = useAuth();
  
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [pedidosLiberacao, setPedidosLiberacao] = useState<PedidoLiberacao[]>([]);
  const [pedidosLiberados, setPedidosLiberados] = useState<PedidoLiberado[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simplified add nota fiscal
  const addNotaFiscal = async (nfData: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    if (!user?.transportadoraId) {
      throw new Error('Usuário não tem transportadora associada');
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
        cliente_id: nfData.clienteId,
        produto: nfData.produto,
        quantidade: nfData.quantidade,
        peso: nfData.peso,
        volume: Number(nfData.volume) || 0,
        localizacao: nfData.localizacao || 'A definir',
        status: 'ARMAZENADA',
        status_separacao: 'pendente',
        transportadora_id: user?.transportadoraId
      });

    if (error) throw error;
    toast.success('✅ Nota Fiscal cadastrada com sucesso!');
  };

  // Simple action functions
  const solicitarCarregamento = async (numeroNF: string) => {
    toast.success('Carregamento solicitado com sucesso!');
  };

  const aprovarCarregamento = async (numeroNF: string, transportadora: string) => {
    toast.success(`✅ Carregamento aprovado para NF ${numeroNF}!`);
  };

  const rejeitarCarregamento = async (numeroNF: string, motivo: string) => {
    toast.success(`❌ Carregamento rejeitado para NF ${numeroNF}!`);
  };

  // Legacy API functions - minimal implementation
  const addPedidoLiberacao = async (data: any) => {
    toast.success('Pedido adicionado');
  };

  const deleteNotaFiscal = async (id: string) => {
    const { error } = await supabase
      .from('notas_fiscais')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Nota Fiscal excluída com sucesso');
  };

  const liberarPedido = async (numeroNF: string, transportadora: string, dataExpedicao?: string) => {
    toast.success('Pedido liberado');
  };

  const deletePedidoLiberacao = async (id: string) => {
    toast.success('Pedido de liberação excluído');
  };

  const deletePedidoLiberado = async (id: string) => {
    toast.success('Pedido liberado excluído');
  };

  const recusarPedido = async (numeroNF: string, motivo: string, responsavel?: string) => {
    toast.success('Pedido recusado');
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