import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Truck, Package, Clock, CheckCircle } from "lucide-react";
import { useAllNFs, useFluxoMutations } from "@/hooks/useNFs";

type MockRole = 'cliente' | 'admin_transportadora' | 'operador';

// Componente que simula o FluxoNFs com dados reais e permissões baseadas no role mockado
function DebugFluxoNFsContent({ role }: { role: MockRole }) {
  const { armazenadas, solicitadas, confirmadas, isLoading } = useAllNFs();
  const { solicitar, confirmar, recusar, isAnyLoading } = useFluxoMutations();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  // Determinar permissões baseado no role
  const isCliente = role === 'cliente';
  const isTransportadora = role === 'admin_transportadora' || role === 'operador';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Fluxo de Notas Fiscais</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie o fluxo completo de solicitação e aprovação de carregamentos em tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Armazenadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              NFs Armazenadas ({armazenadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {armazenadas.length > 0 ? (
              <div className="space-y-3">
                {armazenadas.map((nf: any) => (
                  <div key={nf.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{nf.numero_nf}</p>
                        <p className="text-sm text-muted-foreground">{nf.produto}</p>
                      </div>
                    </div>
                    {isCliente && (
                      <Button
                        size="sm"
                        disabled={isAnyLoading}
                        onClick={() => solicitar.mutate(nf.id)}
                        className="w-full"
                      >
                        {solicitar.isPending ? "Solicitando..." : "Solicitar Carregamento"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma NF armazenada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Coluna Solicitadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Solicitadas ({solicitadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solicitadas.length > 0 ? (
              <div className="space-y-3">
                {solicitadas.map((nf: any) => (
                  <div key={nf.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{nf.numero_nf}</p>
                        <p className="text-sm text-muted-foreground">{nf.produto}</p>
                      </div>
                    </div>
                    {isTransportadora && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={isAnyLoading}
                          onClick={() => confirmar.mutate(nf.id)}
                          className="flex-1"
                        >
                          {confirmar.isPending ? "Aprovando..." : "Aprovar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isAnyLoading}
                          onClick={() => recusar.mutate(nf.id)}
                          className="flex-1"
                        >
                          {recusar.isPending ? "Recusando..." : "Recusar"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma solicitação pendente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Coluna Confirmadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Confirmadas ({confirmadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confirmadas.length > 0 ? (
              <div className="space-y-3">
                {confirmadas.map((nf: any) => (
                  <div key={nf.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{nf.numero_nf}</p>
                        <p className="text-sm text-muted-foreground">{nf.produto}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum carregamento confirmado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DebugFluxoNFs() {
  const [selectedRole, setSelectedRole] = useState<MockRole>('cliente');
  const [isClienteView, setIsClienteView] = useState(true);

  const handleRoleChange = (isCliente: boolean) => {
    setIsClienteView(isCliente);
    setSelectedRole(isCliente ? 'cliente' : 'admin_transportadora');
  };

  const roleInfo = {
    cliente: {
      icon: User,
      title: "Cliente",
      description: "Pode visualizar NFs e solicitar carregamentos",
      permissions: [
        "Visualizar NFs armazenadas",
        "Solicitar carregamento de NFs",
        "Visualizar histórico de solicitações"
      ]
    },
    admin_transportadora: {
      icon: Shield,
      title: "Admin Transportadora", 
      description: "Pode aprovar/recusar solicitações de carregamento",
      permissions: [
        "Visualizar todas as NFs",
        "Aprovar solicitações de carregamento",
        "Recusar solicitações de carregamento",
        "Gerenciar fluxo completo"
      ]
    },
    operador: {
      icon: Truck,
      title: "Operador",
      description: "Pode aprovar/recusar solicitações de carregamento", 
      permissions: [
        "Visualizar todas as NFs",
        "Aprovar solicitações de carregamento",
        "Recusar solicitações de carregamento"
      ]
    }
  };

  const currentRoleInfo = roleInfo[selectedRole];
  const RoleIcon = currentRoleInfo.icon;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            🧪 Debug: Fluxo de NFs
          </h1>
          <p className="text-muted-foreground text-lg">
            Teste a interface do fluxo de NFs simulando diferentes papéis de usuário
          </p>
        </div>

        {/* Controls */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RoleIcon className="w-5 h-5" />
              Simulação de Papel
            </CardTitle>
            <CardDescription>
              Alterne entre os papéis para testar as permissões da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Cliente</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visualiza e solicita carregamentos
                </p>
              </div>
              
              <Switch
                checked={!isClienteView}
                onCheckedChange={(checked) => handleRoleChange(!checked)}
              />
              
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Transportadora</span>
                  <Shield className="w-4 h-4" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Aprova/recusa solicitações
                </p>
              </div>
            </div>

            {/* Current Role Info */}
            <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Badge variant="default" className="mt-1">
                Atual: {currentRoleInfo.title}
              </Badge>
              <div className="space-y-2 flex-1">
                <p className="text-sm">{currentRoleInfo.description}</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Permissões ativas:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {currentRoleInfo.permissions.map((permission, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-300">
              ⚠️ Modo Debug Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-600 dark:text-yellow-400 space-y-2">
            <p>• Esta página é apenas para desenvolvimento e testes</p>
            <p>• Os dados mostrados são seeds de exemplo (prefixo DEV-)</p>
            <p>• As mutações (solicitar/aprovar/recusar) funcionam normalmente</p>
            <p>• Atualizações em tempo real estão ativas</p>
          </CardContent>
        </Card>

        {/* Fluxo Component */}
        <DebugFluxoNFsContent role={selectedRole} />

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            💡 Use esta página para verificar se as permissões e a interface estão 
            funcionando corretamente para cada tipo de usuário
          </p>
        </div>
      </div>
    </div>
  );
}