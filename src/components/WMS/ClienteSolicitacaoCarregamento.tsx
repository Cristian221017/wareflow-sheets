import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWMS } from '@/contexts/WMSContext';
import { Truck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { NotaFiscal } from '@/types/wms';

export function ClienteSolicitacaoCarregamento() {
  const { notasFiscais } = useWMS();
  
  // Filtrar NFs que estão "Liberada para carregar"
  const nfsLiberadas = notasFiscais.filter(nf => nf.status === 'Liberada para carregar');

  const handleSolicitarCarregamento = async (nf: NotaFiscal) => {
    try {
      // Aqui implementaremos a criação da solicitação de carregamento
      toast.success(`Solicitação de carregamento enviada para NF: ${nf.numeroNF}`);
    } catch (error) {
      toast.error('Erro ao enviar solicitação de carregamento');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-warning" />
          Solicitação de Carregamento
        </CardTitle>
        <CardDescription>
          Mercadorias liberadas para carregamento - solicite o carregamento das suas NFs
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
                <TableHead className="text-center">Ação</TableHead>
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
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSolicitarCarregamento(nf)}
                      className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Solicitar Carregamento
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nfsLiberadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma mercadoria liberada para carregamento</p>
            <p className="text-sm mt-1">As mercadorias aparecerão aqui quando forem liberadas pela transportadora</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}