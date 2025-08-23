import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Package } from 'lucide-react';
import { useNFs } from '@/hooks/useNFs';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { NotaFiscal } from '@/types/nf';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ARMAZENADA':
      return 'bg-success text-success-foreground';
    case 'SOLICITADA':
      return 'bg-warning text-warning-foreground';
    case 'CONFIRMADA':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const isOverdue = (dataRecebimento: string, prazoMaximo: number = 30) => {
  const receiptDate = new Date(dataRecebimento);
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > prazoMaximo;
};

export function NotasFiscaisTable() {
  const { data: notasFiscais, isLoading } = useNFs("ARMAZENADA");
  const [selectedCliente, setSelectedCliente] = useState<string>('todos');

  const validNfs = notasFiscais || [];

  // Get unique clients for filter
  const clienteOptions = useMemo(() => {
    const uniqueClientes = Array.from(new Set(validNfs.map(nf => nf.fornecedor)));
    return [
      { value: 'todos', label: 'Todos os fornecedores' },
      ...uniqueClientes.map(fornecedor => ({ value: fornecedor, label: fornecedor }))
    ];
  }, [validNfs]);

  // Filter notes by selected client
  const filteredNFs = useMemo(() => {
    if (selectedCliente === 'todos') {
      return validNfs;
    }
    return validNfs.filter(nf => nf.fornecedor === selectedCliente);
  }, [validNfs, selectedCliente]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Carregando notas fiscais...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas Fiscais</CardTitle>
        <CardDescription>
          Controle de todas as notas fiscais no armazém
        </CardDescription>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar por fornecedor:</span>
            <Combobox
              options={clienteOptions}
              value={selectedCliente}
              onValueChange={setSelectedCliente}
              placeholder="Selecione um fornecedor"
              searchPlaceholder="Buscar fornecedor..."
              className="w-48"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
                 <TableRow>
                  <TableHead>Número NF</TableHead>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Ordem Compra</TableHead>
                  <TableHead>Data Recebimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Volume (m³)</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNFs.map((nf) => (
                <TableRow 
                  key={nf.id}
                   className={cn(
                       isOverdue(nf.data_recebimento) && nf.status === 'ARMAZENADA' 
                         ? 'bg-destructive/10 hover:bg-destructive/20' 
                         : ''
                   )}
                >
                  <TableCell className="font-medium">{nf.numero_nf}</TableCell>
                  <TableCell className="text-primary font-medium">{nf.numero_pedido}</TableCell>
                  <TableCell>{nf.ordem_compra}</TableCell>
                  <TableCell>{new Date(nf.data_recebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{Number(nf.peso).toFixed(1)}</TableCell>
                  <TableCell>{Number(nf.volume).toFixed(2)}</TableCell>
                  <TableCell>{nf.localizacao}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(nf.status)}>
                      {nf.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredNFs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma nota fiscal armazenada</p>
            <p className="text-sm mt-1">As notas fiscais armazenadas aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}