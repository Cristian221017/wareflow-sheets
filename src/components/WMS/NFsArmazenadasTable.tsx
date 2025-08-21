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
import { Button } from '@/components/ui/button';
import { useWMS } from '@/contexts/WMSContext';
import { NotaFiscal } from '@/types/wms';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Package } from 'lucide-react';

const isOverdue = (dataRecebimento: string, prazoMaximo: number = 30) => {
  const receiptDate = new Date(dataRecebimento);
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > prazoMaximo;
};

export function NFsArmazenadasTable() {
  const { notasFiscais, deleteNotaFiscal } = useWMS();

  // Filtrar apenas NFs com status "Armazenada"
  const nfsArmazenadas = useMemo(() => {
    return notasFiscais.filter(nf => nf.status === 'Armazenada');
  }, [notasFiscais]);

  const handleDeleteNF = async (nf: NotaFiscal) => {
    if (window.confirm(`Tem certeza que deseja excluir a NF ${nf.numeroNF}?`)) {
      try {
        await deleteNotaFiscal(nf.id);
        toast.success('Nota fiscal excluída com sucesso');
      } catch (error) {
        toast.error('Erro ao excluir nota fiscal');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-success" />
          Notas Fiscais Armazenadas
        </CardTitle>
        <CardDescription>
          Mercadorias disponíveis no armazém para solicitação de carregamento
        </CardDescription>
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
                <TableHead>Cliente</TableHead>
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
              {nfsArmazenadas.map((nf) => (
                <TableRow 
                  key={nf.id}
                  className={cn(
                    isOverdue(nf.dataRecebimento) 
                      ? 'bg-destructive/10 hover:bg-destructive/20' 
                      : ''
                  )}
                >
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell className="text-primary font-medium">{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell className="font-medium text-primary">{nf.cliente}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{nf.peso.toFixed(1)}</TableCell>
                  <TableCell>{nf.volume.toFixed(2)}</TableCell>
                  <TableCell>{nf.localizacao}</TableCell>
                  <TableCell>
                    <Badge className="bg-success text-success-foreground">
                      Armazenada
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

        {nfsArmazenadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma nota fiscal armazenada</p>
            <p className="text-sm mt-1">As mercadorias aparecerão aqui após o cadastro</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}