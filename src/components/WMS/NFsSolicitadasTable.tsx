import { useState, useMemo } from 'react';
import { useWMS } from '@/contexts/WMSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, Check, X } from 'lucide-react';

export function NFsSolicitadasTable() {
  const { notasFiscais, isLoading } = useWMS();
  const [selectedNF, setSelectedNF] = useState<string>('');
  const [transportadora, setTransportadora] = useState('');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [isAprovarDialogOpen, setIsAprovarDialogOpen] = useState(false);
  const [isRejeitarDialogOpen, setIsRejeitarDialogOpen] = useState(false);

  // Filter NFs with status "Ordem Solicitada"
  const nfsSolicitadas = useMemo(() => {
    const filtered = notasFiscais.filter(nf => nf.status === 'Ordem Solicitada');
    console.log('🚚 [Transportadora] Carregamentos Solicitados:', filtered.length);
    return filtered;
  }, [notasFiscais]);

  const handleAprovar = async () => {
    if (!selectedNF || !transportadora.trim()) return;
    
    try {
      // Funcionalidade removida
      setIsAprovarDialogOpen(false);
      setSelectedNF('');
      setTransportadora('');
    } catch (error) {
      console.error('Erro ao aprovar carregamento:', error);
    }
  };

  const handleRejeitar = async () => {
    if (!selectedNF || !motivoRejeicao.trim()) return;
    
    try {
      // Funcionalidade removida
      setIsRejeitarDialogOpen(false);
      setSelectedNF('');
      setMotivoRejeicao('');
    } catch (error) {
      console.error('Erro ao rejeitar carregamento:', error);
    }
  };

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
          Solicitações de carregamento aguardando aprovação
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
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfsSolicitadas.map((nf) => (
                <TableRow key={nf.id} className="bg-warning/10 hover:bg-warning/20">
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
                      {nf.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {/* Aprovar Dialog */}
                      <Dialog open={isAprovarDialogOpen && selectedNF === nf.numeroNF} onOpenChange={(open) => {
                        setIsAprovarDialogOpen(open);
                        if (open) {
                          setSelectedNF(nf.numeroNF);
                        } else {
                          setSelectedNF('');
                          setTransportadora('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/80">
                            <Check className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aprovar Carregamento</DialogTitle>
                            <DialogDescription>
                              Confirme os dados para aprovar o carregamento da NF {nf.numeroNF}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Transportadora Responsável</label>
                              <Input
                                value={transportadora}
                                onChange={(e) => setTransportadora(e.target.value)}
                                placeholder="Nome da transportadora"
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAprovarDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleAprovar}
                              disabled={!transportadora.trim()}
                              className="bg-success text-success-foreground hover:bg-success/80"
                            >
                              Aprovar Carregamento
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Rejeitar Dialog */}
                      <Dialog open={isRejeitarDialogOpen && selectedNF === nf.numeroNF} onOpenChange={(open) => {
                        setIsRejeitarDialogOpen(open);
                        if (open) {
                          setSelectedNF(nf.numeroNF);
                        } else {
                          setSelectedNF('');
                          setMotivoRejeicao('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rejeitar Carregamento</DialogTitle>
                            <DialogDescription>
                              Informe o motivo para rejeitar o carregamento da NF {nf.numeroNF}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Motivo da Rejeição</label>
                              <Textarea
                                value={motivoRejeicao}
                                onChange={(e) => setMotivoRejeicao(e.target.value)}
                                placeholder="Descreva o motivo da rejeição..."
                                className="mt-1"
                                rows={3}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRejeitarDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleRejeitar}
                              disabled={!motivoRejeicao.trim()}
                              variant="destructive"
                            >
                              Rejeitar Carregamento
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nfsSolicitadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de carregamento</p>
            <p className="text-sm mt-1">As solicitações dos clientes aparecerão aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}