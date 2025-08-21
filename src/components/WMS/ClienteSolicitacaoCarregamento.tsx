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
import { Truck } from 'lucide-react';

export function ClienteSolicitacaoCarregamento() {
  const { notasFiscais, pedidosLiberacao } = useWMS();
  const { user } = useAuth();
  
  // Filter data for current client - NFs que têm pedidos de liberação pendentes
  const nfsLiberadas = notasFiscais.filter(nf => {
    const isClienteNF = nf.cnpjCliente === user?.cnpj; 
    
    // Verificar se existe pedido de liberação pendente para esta NF
    const hasPendingSolicitation = pedidosLiberacao.some(p => 
      p.nfVinculada === nf.numeroNF && 
      p.status === 'Em análise' &&
      p.cnpjCliente === user?.cnpj
    );
    
    console.log('NF Solicitação:', nf.numeroNF, 'Cliente match:', isClienteNF, 'Status NF:', nf.status, 'Tem solicitação pendente:', hasPendingSolicitation);
    return isClienteNF && hasPendingSolicitation;
  });

  console.log('Total NFs com carregamento solicitado:', nfsLiberadas.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-warning" />
          Carregamento Solicitado
        </CardTitle>
        <CardDescription>
          Mercadorias com carregamento solicitado - aguardando confirmação da transportadora
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
              {nfsLiberadas.map((nf) => (
                <TableRow key={nf.id}>
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell>{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.produto}</TableCell>
                  <TableCell>{nf.quantidade}</TableCell>
                  <TableCell>{nf.peso.toFixed(1)}</TableCell>
                  <TableCell>{nf.volume.toFixed(2)}</TableCell>
                  <TableCell>{nf.localizacao}</TableCell>
                  <TableCell>
                    <Badge className="bg-warning text-warning-foreground">
                      {nf.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nfsLiberadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma mercadoria com carregamento solicitado</p>
            <p className="text-sm mt-1">As mercadorias aparecerão aqui quando você solicitar o carregamento</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}