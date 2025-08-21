import { useNFs, useFluxoMutations, NFStatus } from "@/hooks/useNFs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Package, Truck, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NFCardProps {
  nf: any;
  onSolicitar?: () => void;
  onConfirmar?: () => void;
  onRecusar?: () => void;
  showActions?: boolean;
}

function NFCard({ nf, onSolicitar, onConfirmar, onRecusar, showActions }: NFCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{nf.numero_nf}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pedido: {nf.numero_pedido}
            </p>
          </div>
          <Badge variant="outline">
            {nf.cliente?.razao_social || 'Cliente não informado'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Produto:</span>
            <span className="font-medium">{nf.produto}</span>
          </div>
          <div className="flex justify-between">
            <span>Quantidade:</span>
            <span>{nf.quantidade} unidades</span>
          </div>
          <div className="flex justify-between">
            <span>Peso:</span>
            <span>{nf.peso} kg</span>
          </div>
          <div className="flex justify-between">
            <span>Localização:</span>
            <span className="font-medium">{nf.localizacao}</span>
          </div>
          
          {nf.requested_at && (
            <div className="flex justify-between text-xs">
              <span>Solicitado em:</span>
              <span>{new Date(nf.requested_at).toLocaleString('pt-BR')}</span>
            </div>
          )}
          
          {nf.approved_at && (
            <div className="flex justify-between text-xs">
              <span>Confirmado em:</span>
              <span>{new Date(nf.approved_at).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="mt-4 space-y-2">
            {onSolicitar && (
              <Button 
                onClick={onSolicitar} 
                className="w-full"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Solicitar Carregamento
              </Button>
            )}
            
            {(onConfirmar || onRecusar) && (
              <div className="flex gap-2">
                {onConfirmar && (
                  <Button 
                    onClick={onConfirmar}
                    className="flex-1"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar
                  </Button>
                )}
                {onRecusar && (
                  <Button 
                    onClick={onRecusar}
                    variant="destructive"
                    className="flex-1"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Recusar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListaArmazenadas() {
  const { data, isLoading } = useNFs("Armazenada");
  const { solicitar } = useFluxoMutations();
  const { user } = useAuth();
  
  // Cliente pode solicitar, transportadora só visualiza
  const canSolicitar = user?.type === 'cliente';

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">NFs Armazenadas</h3>
        <Badge variant="secondary">{data?.length || 0}</Badge>
      </div>
      
      {!data?.length ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma NF armazenada</p>
          </CardContent>
        </Card>
      ) : (
        data.map(nf => (
          <NFCard
            key={nf.id}
            nf={nf}
            onSolicitar={canSolicitar ? () => solicitar.mutate(nf.id) : undefined}
            showActions={canSolicitar}
          />
        ))
      )}
    </div>
  );
}

function ListaSolicitadas() {
  const { data, isLoading } = useNFs("Ordem Solicitada");
  const { confirmar, recusar } = useFluxoMutations();
  const { user } = useAuth();
  
  // Transportadora pode confirmar/recusar, cliente só visualiza
  const canApprove = user?.role === 'admin_transportadora' || user?.role === 'operador';

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold">Carregamentos Solicitados</h3>
        <Badge variant="secondary">{data?.length || 0}</Badge>
      </div>
      
      {!data?.length ? (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
          </CardContent>
        </Card>
      ) : (
        data.map(nf => (
          <NFCard
            key={nf.id}
            nf={nf}
            onConfirmar={canApprove ? () => confirmar.mutate(nf.id) : undefined}
            onRecusar={canApprove ? () => recusar.mutate(nf.id) : undefined}
            showActions={canApprove}
          />
        ))
      )}
    </div>
  );
}

function ListaConfirmadas() {
  const { data, isLoading } = useNFs("Solicitação Confirmada");

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold">Carregamentos Confirmados</h3>
        <Badge variant="secondary">{data?.length || 0}</Badge>
      </div>
      
      {!data?.length ? (
        <Card>
          <CardContent className="text-center py-8">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum carregamento confirmado</p>
          </CardContent>
        </Card>
      ) : (
        data.map(nf => (
          <NFCard
            key={nf.id}
            nf={nf}
            showActions={false}
          />
        ))
      )}
    </div>
  );
}

export default function FluxoNFs() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Fluxo de Notas Fiscais</h2>
        <p className="text-muted-foreground">
          Acompanhe o status das NFs: Armazenadas → Solicitadas → Confirmadas
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <ListaArmazenadas />
        <ListaSolicitadas />
        <ListaConfirmadas />
      </div>
    </div>
  );
}