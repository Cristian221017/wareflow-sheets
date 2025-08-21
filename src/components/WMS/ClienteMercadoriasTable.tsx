import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWMS } from '@/contexts/WMSContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

export function ClienteMercadoriasTable() {
  const { user } = useAuth();
  const { notasFiscais, isLoading } = useWMS();

  // Filter NFs for current client with status "Armazenada"
  const nfsArmazenadas = useMemo(() => {
    const filtered = notasFiscais.filter(nf => 
      nf.cnpjCliente === user?.cnpj && nf.status === 'Armazenada'
    );
    
    console.log('📦 [Cliente] NFs Armazenadas:', filtered.length, 'para CNPJ:', user?.cnpj);
    return filtered;
  }, [notasFiscais, user?.cnpj]);


  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-success" />
          Notas Fiscais Armazenadas
        </CardTitle>
        <CardDescription>
          Suas mercadorias armazenadas disponíveis
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
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfsArmazenadas.map((nf) => (
                <TableRow key={nf.id}>
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell className="text-primary font-medium">{nf.numeroPedido}</TableCell>
                  <TableCell>{nf.ordemCompra}</TableCell>
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

        {nfsArmazenadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma mercadoria armazenada</p>
            <p className="text-sm mt-1">Suas mercadorias aparecerão aqui após o recebimento</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}