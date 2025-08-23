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
import { useNFs } from '@/hooks/useNFs';
import { CheckCircle } from 'lucide-react';

export function PedidosConfirmadosTransportadora() {
  const { data: confirmadas, isLoading } = useNFs("CONFIRMADA");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Carregando pedidos confirmados...</p>
        </CardContent>
      </Card>
    );
  }

  const validConfirmadas = confirmadas || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          Carregamentos Confirmados
        </CardTitle>
        <CardDescription>
          Carregamentos aprovados e prontos para retirada
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
                <TableHead>Fornecedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Data Confirmação</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validConfirmadas.map((nf) => (
                <TableRow key={nf.id}>
                  <TableCell className="font-medium">{nf.numero_nf}</TableCell>
                  <TableCell>{nf.numero_pedido}</TableCell>
                  <TableCell>{nf.ordem_compra}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{Number(nf.peso).toFixed(1)}</TableCell>
                  <TableCell>{Number(nf.volume).toFixed(2)}</TableCell>
                  <TableCell>
                    {new Date(nf.updated_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-success text-success-foreground">
                      {nf.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {validConfirmadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum carregamento confirmado</p>
            <p className="text-sm mt-1">Os carregamentos aprovados aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}