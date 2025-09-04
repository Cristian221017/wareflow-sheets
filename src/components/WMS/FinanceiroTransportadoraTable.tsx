import { useState, useMemo } from 'react';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { useAuth } from '@/contexts/AuthContext';
import { log, error } from '@/utils/logger';
import { DocumentoFinanceiro } from '@/types/financeiro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  RotateCcw,
  Download,
  Upload,
  Edit,
  FileText,
  Calendar,
  DollarSign,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { RefreshButton } from '@/components/common/RefreshButton';
import { toast } from 'sonner';
import { useRef } from 'react';
import { DoubleConfirmDialog } from '@/components/ui/double-confirm-dialog';

const getStatusColor = (status: string, dataVencimento: string) => {
  const vencido = isVencido(dataVencimento, status);
  
  if (vencido) return 'bg-destructive text-destructive-foreground';
  
  switch (status) {
    case 'Em aberto':
      return 'bg-warning text-warning-foreground';
    case 'Pago':
      return 'bg-success text-success-foreground';
    case 'Vencido':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const isVencido = (dataVencimento: string, status: string): boolean => {
  // Só verifica vencimento por data para documentos 'Em aberto'
  if (!dataVencimento || status !== 'Em aberto') return false;
  
  const date = new Date(dataVencimento + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export function FinanceiroTransportadoraTable() {
  const { documentos, updateDocumentoFinanceiro, uploadArquivo, downloadArquivo, deleteDocumentoFinanceiro, atualizarStatusVencidos } = useFinanceiro();
  const { clientes } = useAuth();
  const [selectedDoc, setSelectedDoc] = useState<DocumentoFinanceiro | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const boletoInputRef = useRef<HTMLInputElement>(null);
  const cteInputRef = useRef<HTMLInputElement>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clienteFilter, setClienteFilter] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Edit form states
  const [editStatus, setEditStatus] = useState<string>('');
  const [editValor, setEditValor] = useState<string>('');
  const [editObservacoes, setEditObservacoes] = useState<string>('');
  const [editDataPagamento, setEditDataPagamento] = useState<string>('');

  const documentosFiltrados = useMemo(() => {
    let filtered = [...documentos];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.numeroCte.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clientes.find(c => c.id === doc.clienteId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'vencidos') {
        // Filtro especial: documentos com status "Vencido" OU "Em aberto" com data vencida
        filtered = filtered.filter(doc => 
          doc.status === 'Vencido' || isVencido(doc.dataVencimento, doc.status)
        );
      } else {
        filtered = filtered.filter(doc => doc.status === statusFilter);
      }
    }
    
    // Cliente filter
    if (clienteFilter !== 'all') {
      filtered = filtered.filter(doc => doc.clienteId === clienteFilter);
    }

    // Data filters
    if (dataInicio) {
      filtered = filtered.filter(doc => 
        new Date(doc.dataVencimento) >= new Date(dataInicio)
      );
    }

    if (dataFim) {
      filtered = filtered.filter(doc => 
        new Date(doc.dataVencimento) <= new Date(dataFim)
      );
    }
    
    return filtered;
  }, [documentos, searchTerm, statusFilter, clienteFilter, clientes, dataInicio, dataFim]);

  const getClienteNome = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.name || 'Cliente não encontrado';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setClienteFilter('all');
    setDataInicio('');
    setDataFim('');
  };

  const handleEdit = (documento: DocumentoFinanceiro) => {
    setSelectedDoc(documento);
    setEditStatus(documento.status);
    setEditValor(documento.valor?.toString() || '');
    setEditObservacoes(documento.observacoes || '');
    setEditDataPagamento(documento.dataPagamento || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;

    try {
      await updateDocumentoFinanceiro(selectedDoc.id, {
        status: editStatus as any,
        valor: editValor ? parseFloat(editValor) : undefined,
        observacoes: editObservacoes,
        dataPagamento: editDataPagamento || undefined
      });
      
      setIsEditDialogOpen(false);
      toast.success('Documento atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar documento');
    }
  };

  const handleFileUpload = async (file: File, type: 'boleto' | 'cte') => {
    if (!selectedDoc) return;

    try {
      log('📤 Upload iniciado via edição:', { file: file.name, type, docId: selectedDoc.id });
      
      await uploadArquivo(selectedDoc.id, { 
        file, 
        type, 
        numeroCte: selectedDoc.numeroCte 
      });
      log('✅ Upload concluído via edição');
      toast.success(`${type === 'boleto' ? 'Boleto' : 'CTE'} anexado com sucesso!`);
    } catch (err) {
      error('❌ Erro no upload via edição:', err);
      toast.error('Erro ao anexar arquivo');
    }
  };

  const handleDownload = async (documento: DocumentoFinanceiro, type: 'boleto' | 'cte') => {
    try {
      await downloadArquivo(documento.id, type);
    } catch (error) {
      toast.error(`Erro ao baixar ${type === 'boleto' ? 'boleto' : 'CTE'}`);
    }
  };

  const [deleteDoc, setDeleteDoc] = useState<DocumentoFinanceiro | null>(null);

  const handleDelete = async (documento: DocumentoFinanceiro) => {
    setDeleteDoc(documento);
  };

  const confirmDelete = async () => {
    if (!deleteDoc) return;
    
    try {
      await deleteDocumentoFinanceiro(deleteDoc.id);
      toast.success('Documento excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir documento');
    }
  };

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const total = documentos.length;
    const emAberto = documentos.filter(d => d.status === 'Em aberto' && !isVencido(d.dataVencimento, d.status)).length;
    const pagos = documentos.filter(d => d.status === 'Pago').length;
    // Considerar vencidos: documentos com status "Vencido" OU "Em aberto" com data vencida
    const vencidos = documentos.filter(d => 
      d.status === 'Vencido' || isVencido(d.dataVencimento, d.status)
    ).length;
    // Valor total dos documentos em aberto (não vencidos) e vencidos
    const valorTotal = documentos
      .filter(d => d.valor && (
        (d.status === 'Em aberto' && !isVencido(d.dataVencimento, d.status)) || 
        d.status === 'Vencido' || 
        isVencido(d.dataVencimento, d.status)
      ))
      .reduce((sum, d) => sum + (d.valor || 0), 0);

    return { total, emAberto, pagos, vencidos, valorTotal };
  }, [documentos]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Em Aberto</p>
                <p className="text-lg font-semibold text-warning">{stats.emAberto}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-success rounded-full" />
              <div>
                <p className="text-xs text-muted-foreground">Pagos</p>
                <p className="text-lg font-semibold text-success">{stats.pagos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-destructive rounded-full" />
              <div>
                <p className="text-xs text-muted-foreground">Vencidos</p>
                <p className="text-lg font-semibold text-destructive">{stats.vencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Em Aberto</p>
                <p className="text-lg font-semibold">
                  R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documentos Financeiros</CardTitle>
              <CardDescription>
                Gerencie CTEs e documentos financeiros
              </CardDescription>
            </div>
            <RefreshButton 
              queryTypes={['documentos_financeiros', 'financeiro', 'dashboard']}
              iconOnly
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="CTE, Cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Em aberto">Em aberto</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="vencidos">Vencidos (automático)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Cliente</Label>
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Ações</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none">
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={atualizarStatusVencidos}
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                  >
                    Atualizar Vencidos
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {documentosFiltrados.length} de {documentos.length} documentos
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CTE</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentosFiltrados.map((documento) => {
                  const docVencido = isVencido(documento.dataVencimento, documento.status);
                  
                  return (
                    <TableRow 
                      key={documento.id}
                      className={docVencido ? 'bg-destructive/10' : ''}
                    >
                      <TableCell className="font-medium">{documento.numeroCte}</TableCell>
                      <TableCell>{getClienteNome(documento.clienteId)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {new Date(documento.dataVencimento).toLocaleDateString('pt-BR')}
                          {docVencido && (
                            <Badge variant="destructive" className="text-xs">Vencido</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {documento.valor ? `R$ ${documento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(documento.status, documento.dataVencimento)}>
                          {documento.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {documento.arquivoBoletoPath && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(documento, 'boleto')}
                            >
                              Boleto
                            </Button>
                          )}
                          {documento.arquivoCtePath && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(documento, 'cte')}
                            >
                              CTE
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(documento)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(documento)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-4">
            {documentosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum documento encontrado</p>
              </div>
            ) : (
              documentosFiltrados.map((documento) => {
                const docVencido = isVencido(documento.dataVencimento, documento.status);
                
                return (
                  <Card key={documento.id} className={`p-4 ${docVencido ? 'border-destructive' : ''}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">CTE #{documento.numeroCte}</span>
                        <Badge className={getStatusColor(documento.status, documento.dataVencimento)}>
                          {documento.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>
                          <p className="font-medium truncate">{getClienteNome(documento.clienteId)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vencimento:</span>
                          <p className="font-medium">
                            {new Date(documento.dataVencimento).toLocaleDateString('pt-BR')}
                            {docVencido && (
                              <Badge variant="destructive" className="text-xs ml-1">Vencido</Badge>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <p className="font-medium">
                            {documento.valor ? `R$ ${documento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {documento.arquivoBoletoPath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(documento, 'boleto')}
                            className="flex-1"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Boleto
                          </Button>
                        )}
                        {documento.arquivoCtePath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(documento, 'cte')}
                            className="flex-1"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            CTE
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(documento)}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(documento)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {documentosFiltrados.length === 0 && documentos.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento encontrado com os filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar Documento - CTE {selectedDoc?.numeroCte}</DialogTitle>
            <DialogDescription>
              Atualize as informações do documento financeiro e anexe arquivos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em aberto">Em aberto</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={editDataPagamento}
                  onChange={(e) => setEditDataPagamento(e.target.value)}
                  disabled={editStatus !== 'Pago'}
                  placeholder={editStatus !== 'Pago' ? 'Disponível apenas para status "Pago"' : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            {/* File Upload Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Documentos Anexados</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Boleto</Label>
                  <div className="flex flex-col gap-2">
                    {selectedDoc?.arquivoBoletoPath ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedDoc && handleDownload(selectedDoc, 'boleto')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Boleto
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum boleto anexado</p>
                    )}
                    
                    <input
                      ref={boletoInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'boleto');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => boletoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedDoc?.arquivoBoletoPath ? 'Substituir' : 'Anexar'} Boleto
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CTE</Label>
                  <div className="flex flex-col gap-2">
                    {selectedDoc?.arquivoCtePath ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedDoc && handleDownload(selectedDoc, 'cte')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar CTE
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum CTE anexado</p>
                    )}
                    
                    <input
                      ref={cteInputRef}
                      type="file"
                      accept=".pdf,.xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'cte');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cteInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedDoc?.arquivoCtePath ? 'Substituir' : 'Anexar'} CTE
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Importar componente de dupla confirmação */}
      <DoubleConfirmDialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
        title="Excluir Documento Financeiro"
        description={`Tem certeza que deseja excluir o documento CTE ${deleteDoc?.numeroCte}? Esta ação não pode ser desfeita e todos os dados relacionados serão permanentemente removidos.`}
        confirmText="Excluir Documento"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}