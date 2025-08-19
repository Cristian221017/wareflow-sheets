import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { useAuth } from '@/contexts/AuthContext';
import { Download, FileText, Receipt, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pago':
      return 'bg-success text-success-foreground';
    case 'Em aberto':
      return 'bg-warning text-warning-foreground';
    case 'Vencido':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function ClienteFinanceiro() {
  const { documentosFinanceiros, downloadArquivo, loading } = useFinanceiro();
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter documents for current client based on email
  const clienteDocumentos = documentosFinanceiros.filter(doc => {
    // This will be filtered by RLS policy on the backend
    return true;
  });

  const handleDownload = async (documentoId: string, type: 'boleto' | 'cte', fileName: string) => {
    try {
      setDownloadingId(`${documentoId}-${type}`);
      await downloadArquivo(documentoId, type);
      toast.success(`${type === 'boleto' ? 'Boleto' : 'CTE'} baixado com sucesso!`);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error(`Erro ao baixar ${type === 'boleto' ? 'boleto' : 'CTE'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Documentos Financeiros
        </CardTitle>
        <CardDescription>
          Visualize e baixe seus boletos e CTEs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clienteDocumentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum documento financeiro encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {clienteDocumentos.map((documento) => (
                <Card key={documento.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-sm">CTE: {documento.numeroCte}</span>
                        <p className="text-xs text-muted-foreground">
                          Venc: {new Date(documento.dataVencimento).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(documento.status)}>
                        {documento.status}
                      </Badge>
                    </div>
                    
                    {documento.valor && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Valor: </span>
                        <span className="font-medium">
                          R$ {Number(documento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {documento.dataPagamento && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Pago em: </span>
                        <span className="font-medium">
                          {new Date(documento.dataPagamento).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {documento.arquivoBoletoPath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(documento.id, 'boleto', 'Boleto')}
                          disabled={downloadingId === `${documento.id}-boleto`}
                          className="flex-1 min-w-0"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          {downloadingId === `${documento.id}-boleto` ? 'Baixando...' : 'Boleto'}
                        </Button>
                      )}
                      
                      {documento.arquivoCtePath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(documento.id, 'cte', 'CTE')}
                          disabled={downloadingId === `${documento.id}-cte`}
                          className="flex-1 min-w-0"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          {downloadingId === `${documento.id}-cte` ? 'Baixando...' : 'CTE'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº CTE</TableHead>
                    <TableHead>Data Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clienteDocumentos.map((documento) => (
                    <TableRow key={documento.id}>
                      <TableCell className="font-medium">{documento.numeroCte}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(documento.dataVencimento).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {documento.valor 
                          ? `R$ ${Number(documento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(documento.status)}>
                          {documento.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {documento.dataPagamento
                          ? new Date(documento.dataPagamento).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {documento.arquivoBoletoPath && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(documento.id, 'boleto', 'Boleto')}
                              disabled={downloadingId === `${documento.id}-boleto`}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              {downloadingId === `${documento.id}-boleto` ? 'Baixando...' : 'Boleto'}
                            </Button>
                          )}
                          
                          {documento.arquivoCtePath && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(documento.id, 'cte', 'CTE')}
                              disabled={downloadingId === `${documento.id}-cte`}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              {downloadingId === `${documento.id}-cte` ? 'Baixando...' : 'CTE'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}