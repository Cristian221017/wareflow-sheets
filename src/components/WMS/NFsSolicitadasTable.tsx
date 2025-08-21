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
import { useWMS } from '@/contexts/WMSContext';
import { useMemo } from 'react';
import { Clock, Truck } from 'lucide-react';

export function NFsSolicitadasTable() {
  const { notasFiscais } = useWMS();

  // Filtrar apenas NFs com status "Ordem Solicitada"
  const nfsSolicitadas = useMemo(() => {
    return notasFiscais.filter(nf => nf.status === 'Ordem Solicitada');
  }, [notasFiscais]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Carregamentos Solicitados
        </CardTitle>
        <CardDescription>
          Mercadorias com solicitação de carregamento pendente de aprovação
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfsSolicitadas.map((nf) => (
                <TableRow 
                  key={nf.id}
                  className="bg-warning/10 hover:bg-warning/20"
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
                    <Badge className="bg-warning text-warning-foreground">
                      Ordem Solicitada
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nfsSolicitadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de carregamento pendente</p>
            <p className="text-sm mt-1">As solicitações dos clientes aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}