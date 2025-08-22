import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Truck, X } from "lucide-react";
import { NFCard } from "./NFCard";
import { useNFs, useFluxoMutations } from "@/hooks/useNFs";
import { subscribeNfChanges } from "@/lib/realtimeNfs";
import { useAuth } from "@/contexts/AuthContext";

// Componente para mostrar estado vazio
function EmptyState({ icon: Icon, title, description }: { 
  icon: React.ComponentType<any>, 
  title: string, 
  description: string 
}) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}

// Coluna de NFs Armazenadas
function ArmazenadasColumn({ canRequest }: { canRequest: boolean }) {
  const { data: nfs, isLoading, isError } = useNFs("ARMAZENADA");
  const { solicitar } = useFluxoMutations();

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          NFs Armazenadas
        </h3>
        <Badge variant="secondary">{validNfs.length}</Badge>
      </div>

      {validNfs.length > 0 ? (
        <div className="space-y-3">
          {validNfs.map((nf) => (
            <NFCard
              key={nf.id}
              nf={nf}
              actions={
                canRequest ? (
                  <Button
                    size="sm"
                    disabled={solicitar.isPending}
                    onClick={() => solicitar.mutate(nf.id)}
                    className="w-full"
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    {solicitar.isPending ? "Solicitando..." : "Solicitar Carregamento"}
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="Nenhuma NF armazenada"
          description="As mercadorias armazenadas aparecerão aqui"
        />
      )}
    </div>
  );
}

// Coluna de Carregamentos Solicitados
function SolicitadasColumn({ canDecide }: { canDecide: boolean }) {
  const { data: nfs, isLoading, isError } = useNFs("SOLICITADA");
  const { confirmar, recusar } = useFluxoMutations();

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Carregamentos Solicitados
        </h3>
        <Badge variant="secondary">{validNfs.length}</Badge>
      </div>

      {validNfs.length > 0 ? (
        <div className="space-y-3">
          {validNfs.map((nf) => (
            <NFCard
              key={nf.id}
              nf={nf}
              showRequestInfo
              actions={
                canDecide ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={confirmar.isPending || recusar.isPending}
                      onClick={() => confirmar.mutate(nf.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {confirmar.isPending ? "Aprovando..." : "Aprovar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={confirmar.isPending || recusar.isPending}
                      onClick={() => recusar.mutate(nf.id)}
                      className="flex-1"
                    >
                      <X className="w-3 h-3 mr-1" />
                      {recusar.isPending ? "Recusando..." : "Recusar"}
                    </Button>
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="Nenhuma solicitação pendente"
          description="As solicitações de carregamento aparecerão aqui"
        />
      )}
    </div>
  );
}

// Coluna de Confirmadas
function ConfirmadasColumn() {
  const { data: nfs, isLoading, isError } = useNFs("CONFIRMADA");

  if (isLoading) return <div className="p-4">Carregando...</div>;
  if (isError) return <div className="p-4 text-red-500">Erro ao carregar dados</div>;

  const validNfs = Array.isArray(nfs) ? nfs : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Carregamentos Confirmados
        </h3>
        <Badge variant="secondary">{validNfs.length}</Badge>
      </div>

      {validNfs.length > 0 ? (
        <div className="space-y-3">
          {validNfs.map((nf) => (
            <NFCard
              key={nf.id}
              nf={nf}
              showApprovalInfo
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="Nenhum carregamento confirmado"
          description="Os carregamentos confirmados aparecerão aqui"
        />
      )}
    </div>
  );
}

// Componente principal do fluxo
export function FluxoNFs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Configurar realtime
  useEffect(() => {
    const cleanup = subscribeNfChanges(queryClient);
    return cleanup;
  }, [queryClient]);

  // Determinar permissões baseado no tipo e role do usuário
  const isCliente = user?.type === 'cliente';
  const isTransportadora = user?.role === 'admin_transportadora' || user?.role === 'operador';
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Fluxo de Notas Fiscais</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o fluxo completo de solicitação e aprovação de carregamentos em tempo real
        </p>
      </div>

      {/* Layout em abas para mobile, colunas para desktop */}
      <div className="block lg:hidden">
        <Tabs defaultValue="armazenadas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="armazenadas">Armazenadas</TabsTrigger>
            <TabsTrigger value="solicitadas">Solicitadas</TabsTrigger>
            <TabsTrigger value="confirmadas">Confirmadas</TabsTrigger>
          </TabsList>
          <TabsContent value="armazenadas" className="mt-6">
            <ArmazenadasColumn canRequest={isCliente} />
          </TabsContent>
          <TabsContent value="solicitadas" className="mt-6">
            <SolicitadasColumn canDecide={isTransportadora} />
          </TabsContent>
          <TabsContent value="confirmadas" className="mt-6">
            <ConfirmadasColumn />
          </TabsContent>
        </Tabs>
      </div>

      {/* Layout em colunas para desktop */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <div>
          <ArmazenadasColumn canRequest={isCliente} />
        </div>
        <div>
          <SolicitadasColumn canDecide={isTransportadora} />
        </div>
        <div>
          <ConfirmadasColumn />
        </div>
      </div>

      {/* Footer com informações */}
      <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">🔄 Atualizações em tempo real ativas</p>
        <p>As mudanças são refletidas automaticamente sem necessidade de recarregar a página</p>
      </div>
    </div>
  );
}