import { useState, useEffect } from 'react';
import { PackageCheck, Calendar, FileText, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshButton } from '@/components/common/RefreshButton';
import { useNFsEntregues, useNFEventos } from '@/hooks/useNFEventos';
import { useLastVisit } from '@/hooks/useLastVisit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MercadoriasEntregues() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNF, setSelectedNF] = useState<string | null>(null);

  const { data: nfsEntregues = [], isLoading } = useNFsEntregues();
  const { data: eventos = [] } = useNFEventos(selectedNF || undefined);
  const { markVisitForComponent } = useLastVisit();

  // Marcar visita imediatamente para limpar notificações
  useEffect(() => {
    markVisitForComponent('nfs-entregues');
  }, [markVisitForComponent]);

  // Filtrar NFs por termo de busca
  const nfsFiltradas = nfsEntregues.filter(nf => 
    nf.numero_nf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nf.clientes as any)?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nf.clientes as any)?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <PackageCheck className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando mercadorias entregues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PackageCheck className="h-8 w-8" />
            Mercadorias Entregues
          </h1>
          <p className="text-muted-foreground">
            Histórico de mercadorias que foram entregues aos clientes
          </p>
        </div>
        
        <div className="flex gap-2">
          <RefreshButton 
            queryTypes={['nfs_entregues', 'dashboard']}
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
            <CardTitle className="text-sm font-medium">Total Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{nfsFiltradas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Entregues Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {nfsFiltradas.filter(nf => {
                if (!(nf as any).data_entrega) return false;
                const hoje = new Date();
                const entrega = new Date((nf as any).data_entrega);
                return entrega.toDateString() === hoje.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {nfsFiltradas.filter(nf => {
                if (!(nf as any).data_entrega) return false;
                const entrega = new Date((nf as any).data_entrega);
                const hoje = new Date();
                const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
                return entrega >= umaSemanaAtras;
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
              <PackageCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma mercadoria entregue</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Nenhuma mercadoria encontrada com os filtros aplicados.'
                  : 'Não há mercadorias entregues no momento.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {nfsFiltradas.map((nf) => {
          const eventoEntrega = eventos.find(e => e.nf_id === nf.id && e.tipo === 'ENTREGA_CONFIRMADA');
          
          return (
            <Card key={nf.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PackageCheck className="h-5 w-5 text-green-600" />
                      NF: {nf.numero_nf}
                    </CardTitle>
                    <CardDescription>
                      Cliente: {(nf.clientes as any)?.nome_fantasia || (nf.clientes as any)?.razao_social || 'N/A'}
                    </CardDescription>
                  </div>
                  
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    Entregue
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                
                {/* Timeline de eventos */}
                <div className="space-y-2">
                  {(nf as any).data_embarque && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-200 rounded-r-md">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Embarcada:</span>
                        <span>{format(new Date((nf as any).data_embarque), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  )}
                  
                  {(nf as any).data_entrega && (
                    <div className="p-3 bg-green-50 border-l-4 border-green-200 rounded-r-md">
                      <div className="flex items-center gap-2 text-sm text-green-800 mb-1">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">Entregue:</span>
                        <span>{format(new Date((nf as any).data_entrega), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                      
                      {eventoEntrega?.observacoes && (
                        <div className="mt-2 text-sm text-green-700">
                          <span className="font-medium">Observações:</span>
                          <p className="mt-1">{eventoEntrega.observacoes}</p>
                        </div>
                      )}
                      
                      {eventoEntrega?.anexos && eventoEntrega.anexos.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-green-700">Anexos:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {eventoEntrega.anexos.map((anexo: any, index: number) => (
                              <div key={index} className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 cursor-pointer">
                                <Download className="h-3 w-3" />
                                <span>{anexo.nome || `Anexo ${index + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}