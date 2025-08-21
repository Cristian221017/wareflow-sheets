import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWMS } from '@/contexts/WMSContext';
import { NotaFiscal } from '@/types/wms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { 
  Filter, 
  Search, 
  Calendar,
  Package,
  RotateCcw,
  Plus,
  CheckSquare,
  Square,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Armazenada':
      return 'bg-success text-success-foreground';
    case 'Ordem Solicitada':
      return 'bg-warning text-warning-foreground';
    case 'Solicitação Confirmada':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const isOverdue = (dataRecebimento: string): boolean => {
  const receivedDate = new Date(dataRecebimento);
  const today = new Date();
  const diffInDays = Math.floor((today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays > 30;
};

export function ClienteMercadoriasTable() {
  const { user } = useAuth();
  const { notasFiscais, addPedidoLiberacao, updateNotaFiscalStatus, pedidosLiberacao } = useWMS();
  const [selectedNFs, setSelectedNFs] = useState<string[]>([]);
  const [isLiberacaoDialogOpen, setIsLiberacaoDialogOpen] = useState(false);
  const [isBulkLiberacaoDialogOpen, setIsBulkLiberacaoDialogOpen] = useState(false);
  const [selectedNF, setSelectedNF] = useState<NotaFiscal | null>(null);
  
  // Filters - removendo statusFilter pois sempre mostra armazenadas
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('all');

  // Filter data for current client - APENAS ARMAZENADAS
  const clienteNFs = useMemo(() => {
    console.log('📦 [Cliente] Filtrando NFs Armazenadas para:', { cnpj: user?.cnpj, totalNFs: notasFiscais.length });
    
    let filtered = notasFiscais.filter(nf => {
      const isClienteNF = nf.cnpjCliente === user?.cnpj;
      const isArmazenada = nf.status === 'Armazenada';
      
      console.log('📦 NF:', nf.numeroNF, 'Cliente match:', isClienteNF, 'Status:', nf.status);
      
      return isClienteNF && isArmazenada;
    });
    
    console.log('📦 Total NFs Armazenadas do cliente:', filtered.length);
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(nf => 
        nf.numeroNF.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nf.numeroPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nf.ordemCompra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nf.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nf.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(nf => {
        const nfDate = new Date(nf.dataRecebimento);
        const diffInDays = Math.floor((today.getTime() - nfDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'last7days':
            return diffInDays <= 7;
          case 'last30days':
            return diffInDays <= 30;
          case 'last90days':
            return diffInDays <= 90;
          case 'overdue':
            return diffInDays > 30;
          default:
            return true;
        }
      });
    }
    
    // Fornecedor filter
    if (fornecedorFilter !== 'all') {
      filtered = filtered.filter(nf => nf.fornecedor === fornecedorFilter);
    }
    
    return filtered;
  }, [notasFiscais, user?.cnpj, pedidosLiberacao, searchTerm, dateFilter, fornecedorFilter]);

  const fornecedores = useMemo(() => {
    const allFornecedores = notasFiscais
      .filter(nf => nf.cnpjCliente === user?.cnpj && nf.status === 'Armazenada')
      .map(nf => nf.fornecedor);
    return [...new Set(allFornecedores)].sort();
  }, [notasFiscais, user?.cnpj]);

  const handleSelectNF = (nfId: string, checked: boolean) => {
    if (checked) {
      setSelectedNFs(prev => [...prev, nfId]);
    } else {
      setSelectedNFs(prev => prev.filter(id => id !== nfId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Selecionar apenas as NFs que estão armazenadas (que já estão filtradas)
      const availableNFs = clienteNFs.map(nf => nf.id);
      setSelectedNFs(availableNFs);
    } else {
      setSelectedNFs([]);
    }
  };

  const handleSolicitarLiberacao = async (nf: NotaFiscal) => {
    try {
      console.log('🚚 Solicitando carregamento para NF:', nf.numeroNF);
      
      // Verificar se já existe solicitação para esta NF
      const existingSolicitation = pedidosLiberacao.find(p => p.nfVinculada === nf.numeroNF);
      if (existingSolicitation) {
        toast.error('Já existe uma solicitação de carregamento para esta NF');
        return;
      }

      // Verificar se o status permite nova solicitação
      if (nf.status !== 'Armazenada') {
        toast.error(`Não é possível solicitar carregamento. Status atual: ${nf.status}`);
        return;
      }

      // Criar pedido de liberação automaticamente
      const pedidoData = {
        numeroPedido: nf.numeroPedido,
        ordemCompra: nf.ordemCompra,
        dataSolicitacao: new Date().toISOString().split('T')[0],
        cliente: nf.cliente,
        cnpjCliente: nf.cnpjCliente,
        nfVinculada: nf.numeroNF,
        produto: nf.produto,
        quantidade: nf.quantidade,
        peso: nf.peso,
        volume: nf.volume,
        prioridade: 'Média' as const,
        responsavel: user?.name || 'Cliente'
      };

      await addPedidoLiberacao(pedidoData);
      
      toast.success(`✅ Solicitação enviada! NF ${nf.numeroNF} movida para "Carregamento Solicitado"`);
      
      // Forçar atualização das NFs selecionadas removendo a que foi solicitada
      setSelectedNFs(prev => prev.filter(id => id !== nf.id));
      
    } catch (error) {
      console.error('Erro ao solicitar carregamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar solicitação de carregamento');
    }
  };

  const handleBulkLiberacao = () => {
    if (selectedNFs.length === 0) {
      toast.error('Selecione pelo menos uma NF para solicitar carregamento');
      return;
    }
    setIsBulkLiberacaoDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setFornecedorFilter('all');
  };

  const selectedNFsForBulk = clienteNFs.filter(nf => selectedNFs.includes(nf.id));
  const allAvailableSelected = clienteNFs.length > 0 && 
    clienteNFs.every(nf => selectedNFs.includes(nf.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Notas Fiscais
        </CardTitle>
        <CardDescription>
          Consulte e gerencie suas mercadorias armazenadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
          {/* Mobile Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search"
                placeholder="NF, Pedido, Produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="overdue">Vencidas (&gt;30 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fornecedor</Label>
              <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {fornecedores.map(fornecedor => (
                    <SelectItem key={fornecedor} value={fornecedor}>
                      {fornecedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ações</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none">
                  <RotateCcw className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Limpar</span>
                </Button>
                {selectedNFs.length > 0 && (
                  <Button 
                    size="sm" 
                    onClick={handleBulkLiberacao}
                    className="bg-warning text-warning-foreground hover:bg-warning/80 flex-1 sm:flex-none"
                  >
                    <Plus className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Solicitar</span> ({selectedNFs.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {clienteNFs.length} de {notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj && nf.status === 'Armazenada').length} mercadorias armazenadas
          </p>
          {selectedNFs.length > 0 && (
            <p className="text-sm text-primary font-medium">
              {selectedNFs.length} item(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-4">
          {clienteNFs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma mercadoria encontrada</p>
            </div>
          ) : (
            <>
              {/* Bulk selection for mobile */}
              {selectedNFs.length > 0 && (
                <Card className="p-4 bg-warning/10 border-warning">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedNFs.length} item(s) selecionado(s)</span>
                    <Button 
                      size="sm" 
                      onClick={handleBulkLiberacao}
                      className="bg-warning text-warning-foreground hover:bg-warning/80"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Solicitar
                    </Button>
                  </div>
                </Card>
              )}
              
               {clienteNFs.map((nf) => {
                 const isNFOverdue = isOverdue(nf.dataRecebimento);
                 const canSelect = true; // Todas as NFs na tela de armazenadas podem ser selecionadas
                 
                 return (
                  <Card key={nf.id} className={`p-4 ${
                    isNFOverdue && nf.status === 'Armazenada' ? 'border-destructive' : ''
                  } ${nf.status === 'Ordem Solicitada' ? 'border-warning' : ''}`}>
                    <div className="space-y-3">
                      {/* Header with selection and NF number */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {canSelect && (
                            <Checkbox
                              checked={selectedNFs.includes(nf.id)}
                              onCheckedChange={(checked) => handleSelectNF(nf.id, checked as boolean)}
                              aria-label={`Selecionar NF ${nf.numeroNF}`}
                            />
                          )}
                          <span className="font-bold text-sm">NF #{nf.numeroNF}</span>
                        </div>
                        <Badge className={getStatusColor(nf.status)}>
                          {nf.status}
                        </Badge>
                      </div>

                      {/* Main info grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Pedido:</span>
                          <p className="font-medium text-primary">{nf.numeroPedido}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Produto:</span>
                          <p className="font-medium truncate">{nf.produto}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fornecedor:</span>
                          <p className="font-medium truncate">{nf.fornecedor}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantidade:</span>
                          <p className="font-medium">{nf.quantidade}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data Receb.:</span>
                          <p className="font-medium">
                            {new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}
                            {isNFOverdue && nf.status === 'Armazenada' && (
                              <Badge variant="destructive" className="text-xs ml-1">Vencida</Badge>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Localização:</span>
                          <p className="font-medium">{nf.localizacao}</p>
                        </div>
                      </div>

                      {/* Additional details (collapsible) */}
                      <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                        <div>
                          <span className="text-muted-foreground">Peso:</span>
                          <p className="font-medium">{nf.peso.toFixed(1)} kg</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Volume:</span>
                          <p className="font-medium">{nf.volume.toFixed(2)} m³</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">OC:</span>
                          <p className="font-medium truncate">{nf.ordemCompra}</p>
                        </div>
                      </div>

                       {/* Action button - sempre mostrar pois todas são armazenadas */}
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => handleSolicitarLiberacao(nf)}
                         className="w-full text-warning border-warning hover:bg-warning hover:text-warning-foreground"
                       >
                         <Truck className="w-3 h-3 mr-1" />
                         Solicitar Carregamento
                       </Button>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allAvailableSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todas as NFs disponíveis"
                  />
                </TableHead>
                <TableHead>Número NF</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>CNPJ Fornecedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {clienteNFs.map((nf) => {
                 const isNFOverdue = isOverdue(nf.dataRecebimento);
                 const canSelect = true; // Todas as NFs na tela de armazenadas podem ser selecionadas
                 
                 return (
                  <TableRow 
                    key={nf.id}
                    className={`
                      ${isNFOverdue && nf.status === 'Armazenada' ? 'bg-destructive/10' : ''}
                      ${nf.status === 'Ordem Solicitada' ? 'bg-warning/10' : ''}
                    `}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedNFs.includes(nf.id)}
                        onCheckedChange={(checked) => handleSelectNF(nf.id, checked as boolean)}
                        disabled={!canSelect}
                        aria-label={`Selecionar NF ${nf.numeroNF}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                    <TableCell className="text-primary font-medium">{nf.numeroPedido}</TableCell>
                    <TableCell>{nf.ordemCompra}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}
                        {isNFOverdue && nf.status === 'Armazenada' && (
                          <Badge variant="destructive" className="text-xs">Vencida</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{nf.fornecedor}</TableCell>
                    <TableCell className="font-mono text-xs">{nf.cnpj}</TableCell>
                    <TableCell>{nf.produto}</TableCell>
                    <TableCell>{nf.quantidade}</TableCell>
                    <TableCell>{nf.peso.toFixed(1)}</TableCell>
                    <TableCell>{nf.volume.toFixed(2)}</TableCell>
                    <TableCell>{nf.localizacao}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(nf.status)}>
                        {nf.status}
                      </Badge>
                    </TableCell>
                   <TableCell className="text-center">
                     {/* Sempre mostrar botão pois todas são armazenadas */}
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handleSolicitarLiberacao(nf)}
                       className="text-warning border-warning hover:bg-warning hover:text-warning-foreground"
                     >
                       <Truck className="w-3 h-3 mr-1" />
                       Solicitar
                     </Button>
                   </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {clienteNFs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma mercadoria encontrada com os filtros aplicados</p>
          </div>
        )}
      </CardContent>

      {/* Dialog for single NF liberation */}
      <Dialog open={isLiberacaoDialogOpen} onOpenChange={setIsLiberacaoDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-2 sm:p-6">
          {(() => {
            console.log('Dialog renderizado - selectedNF:', selectedNF);
            return (
              <FormPedidoLiberacao 
                notaFiscal={selectedNF || undefined}
                onSuccess={() => {
                  setIsLiberacaoDialogOpen(false);
                  setSelectedNF(null);
                  toast.success('Ordem de carregamento criada com sucesso!');
                }}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog for bulk liberation */}
      <Dialog open={isBulkLiberacaoDialogOpen} onOpenChange={setIsBulkLiberacaoDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Solicitação de Carregamento em Massa</DialogTitle>
            <DialogDescription>
              Você está prestes a solicitar carregamento para {selectedNFs.length} nota(s) fiscal(is).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
              <h4 className="font-medium mb-2">NFs Selecionadas:</h4>
              <div className="space-y-2">
                {selectedNFsForBulk.map(nf => (
                  <div key={nf.id} className="flex justify-between items-center text-sm">
                    <span>NF: {nf.numeroNF} - {nf.produto}</span>
                    <span className="text-muted-foreground">Qtd: {nf.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkLiberacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                // Para liberação em massa, seria necessário implementar uma função específica
                // Por enquanto, mostraremos uma mensagem
                toast.info('Funcionalidade de carregamento em massa será implementada em breve');
                setIsBulkLiberacaoDialogOpen(false);
                setSelectedNFs([]);
              }}
              className="bg-warning text-warning-foreground hover:bg-warning/80"
            >
              Confirmar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}