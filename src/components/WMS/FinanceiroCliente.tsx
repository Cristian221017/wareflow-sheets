import { useState, useMemo, useEffect } from 'react';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLastVisit } from '@/hooks/useLastVisit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, FileText, Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useDateUtils } from '@/hooks/useDateUtils';

export function FinanceiroCliente() {
  const { documentos, downloadArquivo, loading } = useFinanceiro();
  const { user } = useAuth();
  const { markVisitForComponent } = useLastVisit();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');

  // Mark visit for instant notification clearing
  useEffect(() => {
    markVisitForComponent('documentos_financeiros');
  }, [markVisitForComponent]);

  // Filtrar documentos do cliente logado
  const documentosCliente = useMemo(() => {
    if (!user?.email) return [];
    
    // Os documentos já são filtrados pelo RLS baseado no email do cliente
    // A política RLS garante que só vejam documentos onde o cliente.email = profiles.email
    return documentos;
  }, [documentos, user?.email]);

  const documentosFiltrados = useMemo(() => {
    let filtered = documentosCliente;
    
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.numeroCte.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

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

    if (valorMin) {
      filtered = filtered.filter(doc => 
        doc.valor && doc.valor >= parseFloat(valorMin)
      );
    }

    if (valorMax) {
      filtered = filtered.filter(doc => 
        doc.valor && doc.valor <= parseFloat(valorMax)
      );
    }
    
    return filtered;
  }, [documentosCliente, searchTerm, statusFilter, dataInicio, dataFim, valorMin, valorMax]);

  const handleDownload = async (documentoId: string, type: 'boleto' | 'cte') => {
    try {
      await downloadArquivo(documentoId, type);
    } catch (error) {
      toast.error(`Erro ao baixar ${type === 'boleto' ? 'boleto' : 'CTE'}`);
    }
  };

  const dateUtils = useDateUtils();
  
  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando documentos financeiros...</p>
        </CardContent>
      </Card>
    );
  }
  
  const getStatusColor = (status: string, dataVencimento: string) => {
    const isVencido = dateUtils.isOverdue(dataVencimento, status);
    
    if (isVencido) return 'bg-destructive text-destructive-foreground';
    
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Documentos Financeiros
        </CardTitle>
        <CardDescription>
          Visualize e baixe seus documentos financeiros (CTEs e Boletos)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="font-medium">Filtros Avançados</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDataInicio('');
                setDataFim('');
                setValorMin('');
                setValorMax('');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar CTE</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Número do CTE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Em aberto">Em aberto</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Vencimento (Início)</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Vencimento (Fim)</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Mínimo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorMin}
                onChange={(e) => setValorMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Máximo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorMax}
                onChange={(e) => setValorMax(e.target.value)}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando {documentosFiltrados.length} de {documentosCliente.length} documentos
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          {documentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento financeiro encontrado</p>
            </div>
          ) : (
            documentosFiltrados.map((documento) => (
              <Card key={documento.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">CTE {documento.numeroCte}</h3>
                      <Badge className={getStatusColor(documento.status, documento.dataVencimento)}>
                        {documento.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>Vencimento:</span>
                        <p className="font-medium text-foreground">
                          {dateUtils.formatForDisplay(documento.dataVencimento)}
                        </p>
                      </div>
                      {documento.valor && (
                        <div>
                          <span>Valor:</span>
                          <p className="font-medium text-foreground">
                            R$ {documento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>

                    {documento.observacoes && (
                      <p className="text-sm text-muted-foreground">{documento.observacoes}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {documento.arquivoBoletoPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(documento.id, 'boleto')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Boleto
                      </Button>
                    )}
                    {documento.arquivoCtePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(documento.id, 'cte')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CTE
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}