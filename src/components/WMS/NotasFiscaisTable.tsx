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
import { Button } from '@/components/ui/button';
import { useWMS } from '@/contexts/WMSContext';
import { NotaFiscal } from '@/types/wms';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const getStatusColor = (status: NotaFiscal['status']) => {
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
  const { notasFiscais, deleteNotaFiscal } = useWMS();
  const [selectedCliente, setSelectedCliente] = useState<string>('todos');

  // Get unique clients for filter
  const clienteOptions = useMemo(() => {
    const uniqueClientes = Array.from(new Set(notasFiscais.map(nf => nf.cliente)));
    return [
      { value: 'todos', label: 'Todos os clientes' },
      ...uniqueClientes.map(cliente => ({ value: cliente, label: cliente }))
    ];
  }, [notasFiscais]);

  // Filter notes by selected client - APENAS ARMAZENADAS
  const filteredNFs = useMemo(() => {
    let filtered = notasFiscais.filter(nf => nf.status === 'ARMAZENADA');
    
    if (selectedCliente !== 'todos') {
      filtered = filtered.filter(nf => nf.cliente === selectedCliente);
    }
    return filtered;
  }, [notasFiscais, selectedCliente]);

  const handleDeleteNF = async (nf: NotaFiscal) => {
    if (window.confirm(`Tem certeza que deseja excluir a NF ${nf.numeroNF}?`)) {
      try {
        await deleteNotaFiscal(nf.id);
      } catch (error) {
        toast.error('Erro ao excluir nota fiscal');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas Fiscais</CardTitle>
        <CardDescription>
          Controle de todas as notas fiscais no armazém
        </CardDescription>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar por cliente:</span>
            <Combobox
              options={clienteOptions}
              value={selectedCliente}
              onValueChange={setSelectedCliente}
              placeholder="Selecione um cliente"
              searchPlaceholder="Buscar cliente..."
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
                  <TableHead>CNPJ Fornecedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Volume (m³)</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNFs.map((nf) => (
                <TableRow 
                  key={nf.id}
                   className={cn(
                       isOverdue(nf.dataRecebimento) && nf.status === 'ARMAZENADA' 
                         ? 'bg-destructive/10 hover:bg-destructive/20' 
                         : '',
                       nf.status === 'SOLICITADA'
                         ? 'bg-warning/10 hover:bg-warning/20' 
                         : ''
                   )}
                >
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell className="text-primary font-medium">{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.cnpj}</TableCell>
                  <TableCell className="font-medium text-primary">{nf.cliente}</TableCell>
                  <TableCell>{nf.cnpjCliente}</TableCell>
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
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteNF(nf)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}