import { useState } from 'react';
import { log, error as logError } from '@/utils/logger';
import { MoreHorizontal, Download, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshButton } from '@/components/common/RefreshButton';
import { useFinanceiro } from '@/contexts/FinanceiroContext';
import { DocumentoFinanceiro } from '@/types/financeiro';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FinanceiroTableProps {
  onEdit?: (documento: DocumentoFinanceiro) => void;
  onDelete?: (documento: DocumentoFinanceiro) => void;
  showActions?: boolean;
  userType?: 'transportadora' | 'cliente';
}

export function FinanceiroTable({ 
  onEdit, 
  onDelete, 
  showActions = true,
  userType = 'transportadora'
}: FinanceiroTableProps) {
  const { documentos, loading, downloadArquivo } = useFinanceiro();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar documentos por busca
  const documentosFiltrados = documentos.filter(doc =>
    doc.numeroCte.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.cliente?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.cliente?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (documento: DocumentoFinanceiro) => {
    if (documento.status === 'Pago' || documento.pagoEm) return 'default';
    if (documento.status === 'Vencido' || 
        (!documento.pagoEm && new Date(documento.dataVencimento) < new Date())) {
      return 'destructive';
    }
    return 'secondary';
  };

  const getStatusLabel = (documento: DocumentoFinanceiro) => {
    if (documento.pagoEm) return 'Pago';
    if (!documento.pagoEm && new Date(documento.dataVencimento) < new Date()) {
      return 'Vencido';
    }
    return 'Em aberto';
  };

  const handleDownload = async (documento: DocumentoFinanceiro, tipo: 'boleto' | 'cte') => {
    try {
      const path = tipo === 'boleto' ? documento.arquivoBoletoPath : documento.arquivoCtePath;
      if (path) {
        await downloadArquivo(documento.id, tipo);
      }
    } catch (error) {
      logError(`Erro ao fazer download do ${tipo}:`, error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documentos Financeiros</CardTitle>
              <CardDescription>
                Gerencie CTEs e boletos da transportadora
              </CardDescription>
            </div>
            <RefreshButton 
              queryTypes={['documentos_financeiros', 'financeiro', 'dashboard']}
              iconOnly
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por CTE ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-sm px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-muted-foreground">Carregando documentos...</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum documento encontrado.' : 'Nenhum documento financeiro cadastrado.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CTE</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Status</TableHead>
                    {showActions && <TableHead className="w-[100px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentosFiltrados.map((documento) => (
                    <TableRow key={documento.id}>
                      <TableCell className="font-medium">
                        {documento.numeroCte}
                      </TableCell>
                      <TableCell>
                        {documento.cliente?.nome_fantasia || documento.cliente?.razao_social || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm",
                          !documento.pagoEm && new Date(documento.dataVencimento) < new Date() 
                            ? "text-destructive font-medium" 
                            : ""
                        )}>
                          {format(new Date(documento.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        {documento.pagoEm ? (
                          <span className="text-green-600 text-sm">
                            {format(new Date(documento.pagoEm), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {documento.valor ? (
                          `R$ ${documento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {documento.valorPago ? (
                          <span className="text-green-600">
                            R$ {documento.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(documento)}>
                          {getStatusLabel(documento)}
                        </Badge>
                      </TableCell>
                      {showActions && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              
                              {documento.arquivoBoletoPath && (
                                <DropdownMenuItem onClick={() => handleDownload(documento, 'boleto')}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Boleto
                                </DropdownMenuItem>
                              )}
                              
                              {documento.arquivoCtePath && (
                                <DropdownMenuItem onClick={() => handleDownload(documento, 'cte')}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download CTE
                                </DropdownMenuItem>
                              )}
                              
                              {userType === 'transportadora' && (
                                <>
                                  <DropdownMenuSeparator />
                                  {onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(documento)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {onDelete && (
                                    <DropdownMenuItem 
                                      onClick={() => onDelete(documento)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}