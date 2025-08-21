import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Package, Truck, ShoppingCart } from "lucide-react";
import { NF } from "@/types/nf";
import { cn } from "@/lib/utils";

interface NFCardProps {
  nf: NF;
  onSolicitar?: () => void;
  onConfirmar?: () => void;
  onRecusar?: () => void;
  showActions?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function NFCard({ 
  nf, 
  onSolicitar, 
  onConfirmar, 
  onRecusar, 
  showActions = false,
  isLoading = false,
  className 
}: NFCardProps) {
  
  // Determinar cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ARMAZENADA':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SOLICITADA':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'CONFIRMADA':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{nf.numero_nf}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pedido: {nf.numero_pedido}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={getStatusColor(nf.status)}>
              {nf.status}
            </Badge>
            {nf.cliente && (
              <Badge variant="outline" className="text-xs">
                {nf.cliente.razao_social}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Produto:</span>
              <p className="font-medium">{nf.produto}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Localização:</span>
              <p className="font-medium">{nf.localizacao}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground">Qtd:</span>
              <p>{nf.quantidade}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Peso:</span>
              <p>{nf.peso} kg</p>
            </div>
            <div>
              <span className="text-muted-foreground">Volume:</span>
              <p>{nf.volume} m³</p>
            </div>
          </div>
          
          {/* Timestamps do fluxo */}
          {nf.requested_at && (
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs">
                <span>Solicitado em:</span>
                <span>{formatDateTime(nf.requested_at)}</span>
              </div>
              {nf.requested_by_profile && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Por:</span>
                  <span>{nf.requested_by_profile.name}</span>
                </div>
              )}
            </div>
          )}
          
          {nf.approved_at && (
            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs">
                <span>Aprovado em:</span>
                <span>{formatDateTime(nf.approved_at)}</span>
              </div>
              {nf.approved_by_profile && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Por:</span>
                  <span>{nf.approved_by_profile.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-4 space-y-2">
            {onSolicitar && (
              <Button 
                onClick={onSolicitar} 
                className="w-full"
                size="sm"
                disabled={isLoading}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {isLoading ? 'Solicitando...' : 'Solicitar Carregamento'}
              </Button>
            )}
            
            {(onConfirmar || onRecusar) && (
              <div className="flex gap-2">
                {onConfirmar && (
                  <Button 
                    onClick={onConfirmar}
                    className="flex-1"
                    size="sm"
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isLoading ? 'Confirmando...' : 'Confirmar'}
                  </Button>
                )}
                {onRecusar && (
                  <Button 
                    onClick={onRecusar}
                    variant="destructive"
                    className="flex-1"
                    size="sm"
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isLoading ? 'Recusando...' : 'Recusar'}
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