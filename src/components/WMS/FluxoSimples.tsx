import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWMS } from '@/contexts/WMSContext';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function FluxoSimples() {
  const { notasFiscais, solicitarCarregamento, aprovarCarregamento, rejeitarCarregamento } = useWMS();
  const { user } = useAuth();
  
  // Filtrar NFs por status
  const armazenadas = notasFiscais.filter(nf => nf.status === 'Armazenada');
  const solicitadas = notasFiscais.filter(nf => nf.status === 'Ordem Solicitada');
  const confirmadas = notasFiscais.filter(nf => nf.status === 'Solicitação Confirmada');

  const handleSolicitar = async (nf: any) => {
    try {
      await solicitarCarregamento(nf.numeroNF);
      toast.success('Carregamento solicitado!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAprovar = async (nf: any) => {
    try {
      await aprovarCarregamento(nf.numeroNF, 'Transportadora Aprovada');
      toast.success('Carregamento aprovado!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRejeitar = async (nf: any) => {
    try {
      await rejeitarCarregamento(nf.numeroNF, 'Rejeitado pela transportadora');
      toast.success('Carregamento rejeitado');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isCliente = user?.role === 'cliente';
  const isTransportadora = user?.role === 'admin_transportadora' || user?.role === 'operador';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Fluxo de Notas Fiscais</h1>
        <p className="text-muted-foreground">
          Gerencie o fluxo de solicitação e aprovação de carregamentos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Armazenadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Armazenadas ({armazenadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {armazenadas.map((nf) => (
              <div key={nf.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">NF: {nf.numeroNF}</p>
                    <p className="text-sm text-muted-foreground">
                      Pedido: {nf.numeroPedido}
                    </p>
                  </div>
                  <Badge variant="secondary">Armazenada</Badge>
                </div>
                <p className="text-sm">
                  <strong>Produto:</strong> {nf.produto}
                </p>
                <p className="text-sm">
                  <strong>Cliente:</strong> {nf.cliente}
                </p>
                <p className="text-sm">
                  <strong>Localização:</strong> {nf.localizacao}
                </p>
                
                {isCliente && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleSolicitar(nf)}
                  >
                    Solicitar Carregamento
                  </Button>
                )}
              </div>
            ))}
            
            {armazenadas.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma NF armazenada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2: Solicitadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Solicitadas ({solicitadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {solicitadas.map((nf) => (
              <div key={nf.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">NF: {nf.numeroNF}</p>
                    <p className="text-sm text-muted-foreground">
                      Pedido: {nf.numeroPedido}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                    Solicitada
                  </Badge>
                </div>
                <p className="text-sm">
                  <strong>Produto:</strong> {nf.produto}
                </p>
                <p className="text-sm">
                  <strong>Cliente:</strong> {nf.cliente}
                </p>
                <p className="text-sm">
                  <strong>Localização:</strong> {nf.localizacao}
                </p>
                
                {isTransportadora && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="flex-1"
                      onClick={() => handleAprovar(nf)}
                    >
                      Aprovar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleRejeitar(nf)}
                    >
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {solicitadas.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma solicitação pendente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 3: Confirmadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirmadas ({confirmadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {confirmadas.map((nf) => (
              <div key={nf.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">NF: {nf.numeroNF}</p>
                    <p className="text-sm text-muted-foreground">
                      Pedido: {nf.numeroPedido}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Confirmada
                  </Badge>
                </div>
                <p className="text-sm">
                  <strong>Produto:</strong> {nf.produto}
                </p>
                <p className="text-sm">
                  <strong>Cliente:</strong> {nf.cliente}
                </p>
                <p className="text-sm">
                  <strong>Localização:</strong> {nf.localizacao}
                </p>
              </div>
            ))}
            
            {confirmadas.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma NF confirmada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}