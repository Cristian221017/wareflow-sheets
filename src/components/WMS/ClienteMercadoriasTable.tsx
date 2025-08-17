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
  Square
} from 'lucide-react';
import { toast } from 'sonner';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Armazenada':
      return 'bg-success text-success-foreground';
    case 'Em Separação':
      return 'bg-warning text-warning-foreground';
    case 'Liberada':
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
  const { notasFiscais, addPedidoLiberacao } = useWMS();
  const [selectedNFs, setSelectedNFs] = useState<string[]>([]);
  const [isLiberacaoDialogOpen, setIsLiberacaoDialogOpen] = useState(false);
  const [isBulkLiberacaoDialogOpen, setIsBulkLiberacaoDialogOpen] = useState(false);
  const [selectedNF, setSelectedNF] = useState<NotaFiscal | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('all');

  // Filter data for current client
  const clienteNFs = useMemo(() => {
    let filtered = notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj);
    
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
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(nf => nf.status === statusFilter);
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
  }, [notasFiscais, user?.cnpj, searchTerm, statusFilter, dateFilter, fornecedorFilter]);

  const fornecedores = useMemo(() => {
    const allFornecedores = notasFiscais
      .filter(nf => nf.cnpjCliente === user?.cnpj)
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
      const availableNFs = clienteNFs.filter(nf => nf.status === 'Armazenada').map(nf => nf.id);
      setSelectedNFs(availableNFs);
    } else {
      setSelectedNFs([]);
    }
  };

  const handleSolicitarLiberacao = (nf: NotaFiscal) => {
    console.log('handleSolicitarLiberacao - NF selecionada:', nf);
    setSelectedNF(nf);
    setIsLiberacaoDialogOpen(true);
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
    setStatusFilter('all');
    setDateFilter('all');
    setFornecedorFilter('all');
  };

  const selectedNFsForBulk = clienteNFs.filter(nf => selectedNFs.includes(nf.id));
  const allAvailableSelected = clienteNFs.filter(nf => nf.status === 'Armazenada').length > 0 && 
    clienteNFs.filter(nf => nf.status === 'Armazenada').every(nf => selectedNFs.includes(nf.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Mercadorias Armazenadas
        </CardTitle>
        <CardDescription>
          Consulte e gerencie suas mercadorias armazenadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Armazenada">Armazenada</SelectItem>
                <SelectItem value="Em Separação">Em Separação</SelectItem>
                <SelectItem value="Liberada">Liberada</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Limpar
              </Button>
              {selectedNFs.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleBulkLiberacao}
                  className="bg-warning text-warning-foreground hover:bg-warning/80"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Solicitar ({selectedNFs.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {clienteNFs.length} de {notasFiscais.filter(nf => nf.cnpjCliente === user?.cnpj).length} mercadorias
          </p>
          {selectedNFs.length > 0 && (
            <p className="text-sm text-primary font-medium">
              {selectedNFs.length} item(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-auto">
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
                const canSelect = nf.status === 'Armazenada';
                
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
                      {nf.status === 'Armazenada' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSolicitarLiberacao(nf)}
                          className="text-warning border-warning hover:bg-warning hover:text-warning-foreground"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Solicitar
                        </Button>
                      )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl">
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