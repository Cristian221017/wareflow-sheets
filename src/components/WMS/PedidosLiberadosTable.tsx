import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWMS } from '@/contexts/WMSContext';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Truck } from 'lucide-react';

export function PedidosLiberadosTable() {
  const { pedidosLiberados } = useWMS();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          Solicitação Confirmada
        </CardTitle>
        <CardDescription>
          Histórico de solicitações confirmadas e expedidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                <TableHead>Data Confirmação</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>NF Vinculada</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Data Expedição</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosLiberados.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.numeroPedido}</TableCell>
                  <TableCell>{pedido.ordemCompra}</TableCell>
                  <TableCell>{new Date(pedido.dataLiberacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.nfVinculada}</TableCell>
                  <TableCell>{pedido.quantidade}</TableCell>
                  <TableCell>{pedido.peso.toFixed(1)}</TableCell>
                  <TableCell>{pedido.volume.toFixed(2)}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    {pedido.transportadora}
                  </TableCell>
                  <TableCell>
                    {pedido.dataExpedicao 
                      ? new Date(pedido.dataExpedicao).toLocaleDateString('pt-BR')
                      : 'Não informado'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirmado
                    </Badge>
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