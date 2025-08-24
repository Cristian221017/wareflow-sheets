import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Package, CheckCircle, Truck, User } from "lucide-react";
import type { NotaFiscal } from "@/types/nf";

interface NFCardProps {
  nf: NotaFiscal;
  actions?: React.ReactNode;
  showRequestInfo?: boolean;
  showApprovalInfo?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  showSelection?: boolean;
}

export function NFCard({ 
  nf, 
  actions, 
  showRequestInfo, 
  showApprovalInfo, 
  isSelected = false,
  onSelect,
  showSelection = false 
}: NFCardProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (nf.status) {
      case 'ARMAZENADA': return <Package className="w-4 h-4" />;
      case 'SOLICITADA': return <Clock className="w-4 h-4" />;
      case 'CONFIRMADA': return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (nf.status) {
      case 'ARMAZENADA': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SOLICITADA': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CONFIRMADA': return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header com seleção, NF e Status */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            {showSelection && onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(nf.id, !!checked)}
                className="mt-1"
              />
            )}
            <div>
              <h4 className="font-semibold text-lg">NF {nf.numero_nf}</h4>
              <p className="text-sm text-muted-foreground">Pedido: {nf.numero_pedido}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor()} flex items-center gap-1`}>
            {getStatusIcon()}
            {nf.status}
          </Badge>
        </div>

        {/* Informações principais */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Ordem:</span>
            <p className="font-medium">{nf.ordem_compra}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Produto:</span>
            <p className="font-medium">{nf.produto}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Fornecedor:</span>
            <p className="font-medium">{nf.fornecedor}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Localização:</span>
            <p className="font-medium">{nf.localizacao}</p>
          </div>
        </div>

        {/* Informações de quantidade */}
        <div className="flex justify-between text-sm bg-muted/30 rounded-lg p-2">
          <span><strong>Qtd:</strong> {nf.quantidade}</span>
          <span><strong>Peso:</strong> {nf.peso.toFixed(1)}kg</span>
          <span><strong>Volume:</strong> {nf.volume.toFixed(2)}m³</span>
        </div>

        {/* Informações de solicitação */}
        {showRequestInfo && nf.requested_at && (
          <div className="text-xs text-muted-foreground bg-orange-50 p-2 rounded">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Solicitado em: {formatDate(nf.requested_at)}</span>
            </div>
          </div>
        )}

        {/* Informações de aprovação */}
        {showApprovalInfo && nf.approved_at && (
          <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Confirmado em: {formatDate(nf.approved_at)}</span>
            </div>
          </div>
        )}

        {/* Ações */}
        {actions && (
          <div className="pt-2 border-t">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}