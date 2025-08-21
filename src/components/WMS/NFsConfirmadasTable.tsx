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
import { CheckCircle, TruckIcon } from 'lucide-react';

export function NFsConfirmadasTable() {
  const { notasFiscais } = useWMS();

  // Filtrar apenas NFs com status "Solicitação Confirmada"
  const nfsConfirmadas = useMemo(() => {
    return notasFiscais.filter(nf => nf.status === 'Solicitação Confirmada');
  }, [notasFiscais]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          Carregamentos Confirmados
        </CardTitle>
        <CardDescription>
          Mercadorias com carregamento aprovado e confirmado
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
              {nfsConfirmadas.map((nf) => (
                <TableRow 
                  key={nf.id}
                  className="bg-success/10 hover:bg-success/20"
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
                      Solicitação Confirmada
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nfsConfirmadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TruckIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum carregamento confirmado</p>
            <p className="text-sm mt-1">As confirmações aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}