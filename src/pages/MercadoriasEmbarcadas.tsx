import { useState, useEffect } from 'react';
import { Truck, Package, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshButton } from '@/components/common/RefreshButton';
import { ConfirmarEventoDialog } from '@/components/WMS/ConfirmarEventoDialog';
import { useNFsEmbarcadas, useNFEventosMutations } from '@/hooks/useNFEventos';
import { useLastVisit } from '@/hooks/useLastVisit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MercadoriasEmbarcadas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNF, setSelectedNF] = useState<any>(null);
  const [showConfirmarEntrega, setShowConfirmarEntrega] = useState(false);

  const { data: nfsEmbarcadas = [], isLoading } = useNFsEmbarcadas();
  const { confirmarEntrega } = useNFEventosMutations();
  const { markVisitForComponent } = useLastVisit();

  // Marcar visita imediatamente para limpar notificações
  useEffect(() => {
    markVisitForComponent('nfs-embarcadas');
  }, [markVisitForComponent]);

  // Filtrar NFs por termo de busca
  const nfsFiltradas = nfsEmbarcadas.filter(nf => 
    nf.numero_nf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nf.clientes as any)?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nf.clientes as any)?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirmarEntrega = (data: any) => {
    if (!selectedNF) return;

    confirmarEntrega.mutate(
      {
        nfId: selectedNF.id,
        ...data,
      },
      {
        onSuccess: () => {
          setShowConfirmarEntrega(false);
          setSelectedNF(null);
        },
      }
    );
  };

  const openConfirmarEntrega = (nf: any) => {
    setSelectedNF(nf);
    setShowConfirmarEntrega(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando mercadorias embarcadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Mercadorias Embarcadas
          </h1>
          <p className="text-muted-foreground">
            Mercadorias que foram embarcadas e estão aguardando confirmação de entrega
          </p>
        </div>
        
        <div className="flex gap-2">
          <RefreshButton 
            queryTypes={['nfs_embarcadas', 'dashboard']}
            iconOnly 
          />
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por número da NF ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Embarcadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nfsFiltradas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aguardando Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {nfsFiltradas.filter(nf => !(nf as any).data_entrega).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Embarcadas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {nfsFiltradas.filter(nf => {
                if (!(nf as any).data_embarque) return false;
                const hoje = new Date();
                const embarque = new Date((nf as any).data_embarque);
                return embarque.toDateString() === hoje.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de NFs */}
      <div className="space-y-4">
        {nfsFiltradas.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma mercadoria embarcada</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Nenhuma mercadoria encontrada com os filtros aplicados.'
                  : 'Não há mercadorias embarcadas no momento.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {nfsFiltradas.map((nf) => (
          <Card key={nf.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    NF: {nf.numero_nf}
                  </CardTitle>
                  <CardDescription>
                    Cliente: {(nf.clientes as any)?.nome_fantasia || (nf.clientes as any)?.razao_social || 'N/A'}
                  </CardDescription>
                </div>
                
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    Embarcada
                  </Badge>
                  {!(nf as any).data_entrega && (
                    <Button
                      size="sm"
                      onClick={() => openConfirmarEntrega(nf)}
                      disabled={confirmarEntrega.isPending}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Produto:</span>
                  <p className="text-muted-foreground">{nf.produto}</p>
                </div>
                <div>
                  <span className="font-medium">Quantidade:</span>
                  <p className="text-muted-foreground">{nf.quantidade}</p>
                </div>
                <div>
                  <span className="font-medium">Peso:</span>
                  <p className="text-muted-foreground">{nf.peso} kg</p>
                </div>
                <div>
                  <span className="font-medium">Volume:</span>
                  <p className="text-muted-foreground">{nf.volume} m³</p>
                </div>
              </div>
              
              {(nf as any).data_embarque && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Embarcada em:</span>
                    <span>{format(new Date((nf as any).data_embarque), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              )}
              
              {(nf as any).data_entrega && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Entregue em:</span>
                    <span>{format(new Date((nf as any).data_entrega), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmação de entrega */}
      <ConfirmarEventoDialog
        open={showConfirmarEntrega}
        onOpenChange={setShowConfirmarEntrega}
        onConfirm={handleConfirmarEntrega}
        isPending={confirmarEntrega.isPending}
        title="Confirmar Entrega"
        description="Confirme a entrega da mercadoria informando a data e observações."
        nfInfo={selectedNF ? {
          numero_nf: selectedNF.numero_nf,
          cliente_nome: (selectedNF.clientes as any)?.nome_fantasia || (selectedNF.clientes as any)?.razao_social
        } : undefined}
      />
    </div>
  );
}