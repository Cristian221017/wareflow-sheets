import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

export function PedidosConfirmadosTable() {
  const { notasFiscais } = useWMS();
  const { user } = useAuth();
  
  // Filter data for current user - APENAS SOLICITAÇÃO CONFIRMADA
  const nfsConfirmadas = notasFiscais.filter(nf => {
    // Se for transportador, mostrar todas as confirmadas
    const isConfirmada = nf.status === 'Solicitação Confirmada';
    
    // Se for cliente (tem cnpj), mostrar apenas suas NFs
    if (user?.cnpj) {
      const isClienteNF = nf.cnpjCliente === user.cnpj;
      console.log('NF Confirmada (Cliente):', nf.numeroNF, 'Cliente match:', isClienteNF, 'Status:', nf.status, 'É confirmada:', isConfirmada);
      return isClienteNF && isConfirmada;
    }
    
    // Se for transportador, mostrar todas as confirmadas
    console.log('NF Confirmada (Transportador):', nf.numeroNF, 'Status:', nf.status, 'É confirmada:', isConfirmada);
    return isConfirmada;
  });

  console.log('Total NFs confirmadas:', nfsConfirmadas.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          Carregamentos Confirmados
        </CardTitle>
        <CardDescription>
          Mercadorias com carregamento confirmado pela transportadora
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº NF</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Ordem Compra</TableHead>
                {!user?.cnpj && <TableHead>Cliente</TableHead>}
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
              {nfsConfirmadas.map((nf) => (
                <TableRow key={nf.id}>
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell>{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
                  {!user?.cnpj && <TableCell className="font-medium text-primary">{nf.cliente}</TableCell>}
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{nf.peso.toFixed(1)}</TableCell>
                  <TableCell>{nf.volume.toFixed(2)}</TableCell>
                  <TableCell>{nf.localizacao}</TableCell>
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

        {nfsConfirmadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum carregamento confirmado</p>
            <p className="text-sm mt-1">As mercadorias aparecerão aqui após a confirmação da transportadora</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}