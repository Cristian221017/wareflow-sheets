import { useNFs, useFluxoMutations } from "@/hooks/useNFs";
import { NFStatus } from "@/types/nf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NFCard } from "./NFCard";

/**
 * Componente principal do fluxo de NFs
 * Implementa as 3 colunas: ARMAZENADA → SOLICITADA → CONFIRMADA
 */

function ListaArmazenadas() {
  const { data, isLoading, error } = useNFs("ARMAZENADA");
  const { solicitar, isLoading: isMutating } = useFluxoMutations();
  const { user } = useAuth();
  
  // Cliente pode solicitar, transportadora só visualiza
  const canSolicitar = user?.type === 'cliente';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Erro ao carregar NFs armazenadas</p>
        </CardContent>
      </Card>
    );
  }

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
        <div className="space-y-3">
          {data.map(nf => (
            <NFCard
              key={nf.id}
              nf={nf}
              onSolicitar={canSolicitar ? () => solicitar.mutate(nf.id) : undefined}
              showActions={canSolicitar}
              isLoading={isMutating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListaSolicitadas() {
  const { data, isLoading, error } = useNFs("SOLICITADA");
  const { confirmar, recusar, isLoading: isMutating } = useFluxoMutations();
  const { user } = useAuth();
  
  // Transportadora pode confirmar/recusar, cliente só visualiza
  const canApprove = user?.role === 'admin_transportadora' || user?.role === 'operador';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Erro ao carregar solicitações</p>
        </CardContent>
      </Card>
    );
  }

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
        <div className="space-y-3">
          {data.map(nf => (
            <NFCard
              key={nf.id}
              nf={nf}
              onConfirmar={canApprove ? () => confirmar.mutate(nf.id) : undefined}
              onRecusar={canApprove ? () => recusar.mutate(nf.id) : undefined}
              showActions={canApprove}
              isLoading={isMutating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListaConfirmadas() {
  const { data, isLoading, error } = useNFs("CONFIRMADA");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Erro ao carregar confirmadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold">Carregamentos Confirmados</h3>
        <Badge variant="secondary">{data?.length || 0}</Badge>
      </div>
      
      {!data?.length ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum carregamento confirmado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map(nf => (
            <NFCard
              key={nf.id}
              nf={nf}
              showActions={false}
            />
          ))}
        </div>
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
          Acompanhe o fluxo: ARMAZENADA → SOLICITADA → CONFIRMADA
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