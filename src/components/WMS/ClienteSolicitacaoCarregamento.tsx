import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNFs } from '@/hooks/useNFs';
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
import { Clock } from 'lucide-react';

export function ClienteSolicitacaoCarregamento() {
  const { user } = useAuth();
  const { data: nfsSolicitadas, isLoading } = useNFs("SOLICITADA");

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
          <Clock className="w-5 h-5 text-warning" />
          Carregamentos Solicitados
        </CardTitle>
        <CardDescription>
          Suas solicitações de carregamento aguardando aprovação da transportadora
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
              {(nfsSolicitadas || []).map((nf) => (
                <TableRow key={nf.id} className="bg-warning/10 hover:bg-warning/20">
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
                    <Badge className="bg-warning text-warning-foreground">
                      {nf.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {(!nfsSolicitadas || nfsSolicitadas.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum carregamento solicitado</p>
            <p className="text-sm mt-1">Suas solicitações aparecerão aqui após enviadas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}