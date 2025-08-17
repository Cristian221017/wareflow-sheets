import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotaFiscal, PedidoLiberacao, PedidoLiberado } from '@/types/wms';
import { notificationService } from '@/utils/notificationService';
import { useAuth } from '@/contexts/AuthContext';

interface WMSContextType {
  notasFiscais: NotaFiscal[];
  pedidosLiberacao: PedidoLiberacao[];
  pedidosLiberados: PedidoLiberado[];
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => void;
  addPedidoLiberacao: (pedido: Omit<PedidoLiberacao, 'id' | 'createdAt' | 'status'>) => void;
  liberarPedido: (pedidoId: string, transportadora: string, dataExpedicao?: string) => void;
  updateNotaFiscalStatus: (nfId: string, status: NotaFiscal['status']) => void;
}

const WMSContext = createContext<WMSContextType | undefined>(undefined);

// Mock initial data
const mockNotasFiscais: NotaFiscal[] = [
  {
    id: '1',
    numeroNF: 'NF001234',
    numeroPedido: 'PED-2024-001',
    ordemCompra: 'OC-ABC-001',
    dataRecebimento: '2024-01-15',
    fornecedor: 'Fornecedor ABC',
    cnpj: '12.345.678/0001-90',
    cliente: 'Cliente Premium',
    cnpjCliente: '11.222.333/0001-44',
    produto: 'Produto A',
    quantidade: 100,
    peso: 50.5,
    volume: 2.3,
    localizacao: 'A1-B2-C3',
    status: 'Armazenada',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    numeroNF: 'NF001235',
    numeroPedido: 'PED-2024-002',
    ordemCompra: 'OC-XYZ-002',
    dataRecebimento: '2024-01-10',
    fornecedor: 'Fornecedor XYZ',
    cnpj: '98.765.432/0001-10',
    cliente: 'Cliente Premium',
    cnpjCliente: '11.222.333/0001-44',
    produto: 'Produto B',
    quantidade: 75,
    peso: 30.2,
    volume: 1.8,
    localizacao: 'B1-C2-D3',
    status: 'Ordem Solicitada',
    createdAt: '2024-01-10T14:30:00Z'
  },
  {
    id: '3',
    numeroNF: 'NF001236',
    numeroPedido: 'PED-2024-003',
    ordemCompra: 'OC-DEF-003',
    dataRecebimento: '2024-01-12',
    fornecedor: 'Fornecedor DEF',
    cnpj: '55.666.777/0001-88',
    cliente: 'Cliente Corporativo',
    cnpjCliente: '22.333.444/0001-55',
    produto: 'Produto C',
    quantidade: 200,
    peso: 80.0,
    volume: 4.5,
    localizacao: 'C1-D2-E3',
    status: 'Armazenada',
    createdAt: '2024-01-12T16:00:00Z'
  }
];

const mockPedidosLiberacao: PedidoLiberacao[] = [
  {
    id: '1',
    numeroPedido: 'PED001',
    ordemCompra: 'OC-ABC-001',
    dataSolicitacao: '2024-01-16',
    cliente: 'Cliente Premium',
    cnpjCliente: '11.222.333/0001-44',
    nfVinculada: 'NF001234',
    produto: 'Produto A',
    quantidade: 50,
    peso: 25.0,
    volume: 1.2,
    prioridade: 'Alta',
    responsavel: 'João Silva',
    status: 'Em análise',
    createdAt: '2024-01-16T09:00:00Z'
  }
];

export function WMSProvider({ children }: { children: React.ReactNode }) {
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>(mockNotasFiscais);
  const [pedidosLiberacao, setPedidosLiberacao] = useState<PedidoLiberacao[]>(mockPedidosLiberacao);
  const [pedidosLiberados, setPedidosLiberados] = useState<PedidoLiberado[]>([]);
  const { clientes } = useAuth();

  const addNotaFiscal = (nf: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    const newNF: NotaFiscal = {
      ...nf,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setNotasFiscais(prev => [...prev, newNF]);

    // Enviar notificação de rastreabilidade
    const cliente = clientes.find(c => c.name === nf.cliente);
    if (cliente?.emailNotaFiscal) {
      notificationService.enviarNotificacaoNFCadastrada(
        cliente.emailNotaFiscal,
        nf.numeroNF,
        nf.cliente
      );
    }
  };

  const addPedidoLiberacao = (pedido: Omit<PedidoLiberacao, 'id' | 'createdAt' | 'status'>) => {
    const newPedido: PedidoLiberacao = {
      ...pedido,
      id: Date.now().toString(),
      status: 'Em análise',
      createdAt: new Date().toISOString()
    };
    setPedidosLiberacao(prev => [...prev, newPedido]);

    // Atualizar status da NF para "Ordem Solicitada"
    const nf = notasFiscais.find(n => n.numeroNF === pedido.nfVinculada);
    if (nf) {
      updateNotaFiscalStatus(nf.id, 'Ordem Solicitada');
    }

    // Enviar notificação de rastreabilidade
    const cliente = clientes.find(c => c.name === pedido.cliente);
    if (cliente?.emailSolicitacaoLiberacao) {
      notificationService.enviarNotificacaoSolicitacaoCarregamento(
        cliente.emailSolicitacaoLiberacao,
        pedido.numeroPedido,
        pedido.cliente
      );
    }
  };

  const liberarPedido = (pedidoId: string, transportadora: string, dataExpedicao?: string) => {
    const pedido = pedidosLiberacao.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Create liberado record
    const pedidoLiberado: PedidoLiberado = {
      id: Date.now().toString(),
      numeroPedido: pedido.numeroPedido,
      ordemCompra: pedido.ordemCompra,
      dataLiberacao: new Date().toISOString().split('T')[0],
      cliente: pedido.cliente,
      nfVinculada: pedido.nfVinculada,
      quantidade: pedido.quantidade,
      peso: pedido.peso,
      volume: pedido.volume,
      transportadora,
      dataExpedicao,
      createdAt: new Date().toISOString()
    };

    // Update states
    setPedidosLiberados(prev => [...prev, pedidoLiberado]);
    setPedidosLiberacao(prev => prev.filter(p => p.id !== pedidoId));
    
    // Update NF status
    const nf = notasFiscais.find(n => n.numeroNF === pedido.nfVinculada);
    if (nf) {
      updateNotaFiscalStatus(nf.id, 'Solicitação Confirmada');
    }

    // Enviar notificação de rastreabilidade
    const cliente = clientes.find(c => c.name === pedido.cliente);
    if (cliente?.emailLiberacaoAutorizada) {
      notificationService.enviarNotificacaoConfirmacaoAutorizada(
        cliente.emailLiberacaoAutorizada,
        pedido.numeroPedido,
        transportadora
      );
    }
  };

  const updateNotaFiscalStatus = (nfId: string, status: NotaFiscal['status']) => {
    setNotasFiscais(prev => 
      prev.map(nf => nf.id === nfId ? { ...nf, status } : nf)
    );
  };

  return (
    <WMSContext.Provider value={{
      notasFiscais,
      pedidosLiberacao,
      pedidosLiberados,
      addNotaFiscal,
      addPedidoLiberacao,
      liberarPedido,
      updateNotaFiscalStatus
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