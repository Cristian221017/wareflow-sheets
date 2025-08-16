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
import { NotaFiscal } from '@/types/wms';
import { cn } from '@/lib/utils';

const getStatusColor = (status: NotaFiscal['status']) => {
  switch (status) {
    case 'Armazenada':
      return 'bg-success text-success-foreground';
    case 'Em Separação':
      return 'bg-warning text-warning-foreground';
    case 'Liberada':
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
  const { notasFiscais } = useWMS();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas Fiscais Armazenadas</CardTitle>
        <CardDescription>
          Controle de todas as notas fiscais no armazém
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número NF</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiscais.map((nf) => (
                <TableRow 
                  key={nf.id}
                  className={cn(
                    isOverdue(nf.dataRecebimento) && nf.status === 'Armazenada' 
                      ? 'bg-destructive/10 hover:bg-destructive/20' 
                      : '',
                    nf.status === 'Em Separação' 
                      ? 'bg-warning/10 hover:bg-warning/20' 
                      : ''
                  )}
                >
                  <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                  <TableCell>{new Date(nf.dataRecebimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{nf.fornecedor}</TableCell>
                  <TableCell>{nf.cnpj}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}