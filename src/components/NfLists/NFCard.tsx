import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Package, CheckCircle, Truck, User, Download, Trash2 } from "lucide-react";
import type { NotaFiscal } from "@/types/nf";
import { getAnexoUrl } from "@/lib/nfApi";
import { toast } from "sonner";
import { error as logError } from "@/utils/logger";

interface NFCardProps {
  nf: NotaFiscal;
  actions?: React.ReactNode;
  showRequestInfo?: boolean;
  showApprovalInfo?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  showSelection?: boolean;
  onDelete?: (nfId: string) => void;
  canDelete?: boolean;
}

export function NFCard({ 
  nf, 
  actions, 
  showRequestInfo, 
  showApprovalInfo, 
  isSelected = false,
  onSelect,
  showSelection = false,
  onDelete,
  canDelete = false
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
      case 'PENDENTE': return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = () => {
    switch (nf.status) {
      case 'ARMAZENADA': return 'Armazenada';
      case 'SOLICITADA': return 'Solicitada';
      case 'CONFIRMADA': return 'Confirmada';
      case 'PENDENTE': return 'Pendente';
      default: return nf.status || 'Status não definido';
    }
  };

  const getStatusColor = () => {
    switch (nf.status) {
      case 'ARMAZENADA': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SOLICITADA': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CONFIRMADA': return 'bg-green-100 text-green-800 border-green-300';
      case 'PENDENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeparacaoStatusColor = () => {
    switch (nf.status_separacao) {
      case 'pendente': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'em_separacao': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'separacao_concluida': return 'bg-green-100 text-green-800 border-green-300';
      case 'separacao_com_pendencia': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeparacaoStatusLabel = () => {
    switch (nf.status_separacao) {
      case 'pendente': return 'Separação Pendente';
      case 'em_separacao': return 'Em Separação';
      case 'separacao_concluida': return 'Separação Concluída';
      case 'separacao_com_pendencia': return 'Separação com Pendência';
      default: return 'Status não definido';
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
          <div className="flex flex-col gap-1">
            <Badge className={`${getStatusColor()} flex items-center gap-1`}>
              {getStatusIcon()}
              {getStatusLabel()}
            </Badge>
            <Badge variant="outline" className={`${getSeparacaoStatusColor()} text-xs`}>
              {getSeparacaoStatusLabel()}
            </Badge>
          </div>
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
          <span><strong>Peso:</strong> {(nf.peso || 0).toFixed(1)}kg</span>
          <span><strong>Volume:</strong> {(nf.volume || 0).toFixed(2)}m³</span>
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

        {/* Informações de agendamento e documentos da solicitação */}
        {showRequestInfo && (nf.data_agendamento_entrega || nf.observacoes_solicitacao || nf.documentos_anexos?.length > 0) && (
          <div className="text-xs bg-primary/5 border border-primary/20 rounded p-3">
            <h5 className="font-medium text-primary mb-2">Informações da Solicitação:</h5>
            
            {nf.data_agendamento_entrega && (
              <p className="text-muted-foreground mb-1">
                <span className="font-medium">Data de Agendamento:</span>{' '}
                {new Date(nf.data_agendamento_entrega).toLocaleDateString('pt-BR')}
              </p>
            )}
            
            {nf.observacoes_solicitacao && (
              <p className="text-muted-foreground mb-1">
                <span className="font-medium">Observações:</span> {nf.observacoes_solicitacao}
              </p>
            )}
            
            {nf.documentos_anexos && Array.isArray(nf.documentos_anexos) && nf.documentos_anexos.length > 0 && (
              <div className="text-muted-foreground">
                <span className="font-medium">Documentos anexados ({nf.documentos_anexos.length}):</span>
                <div className="mt-2 space-y-1">
                  {nf.documentos_anexos.map((doc: any, docIndex: number) => (
                    <div key={`${doc.name || doc.nome}-${docIndex}`} className="flex items-center justify-between text-xs p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <span>{doc.name || doc.nome}</span>
                        <span className="text-muted-foreground">
                          ({((doc.size || doc.tamanho || 0) / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      {(doc.path || doc.caminho) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              // Obter a URL do anexo
                              const url = await getAnexoUrl(doc.path || doc.caminho);
                              
                              // Fazer fetch da URL para obter o blob
                              const response = await fetch(url);
                              if (!response.ok) {
                                throw new Error(`Erro HTTP: ${response.status}`);
                              }
                              
                              const blob = await response.blob();
                              
                              // Criar URL local do blob
                              const blobUrl = URL.createObjectURL(blob);
                              
                              // Criar link para download forçado
                              const a = document.createElement('a');
                              a.style.display = 'none';
                              a.href = blobUrl;
                              a.download = doc.name || doc.nome || 'documento';
                              
                              document.body.appendChild(a);
                              a.click();
                              
                              // Cleanup
                              setTimeout(() => {
                                document.body.removeChild(a);
                                URL.revokeObjectURL(blobUrl);
                              }, 100);
                              
                              toast.success('Download iniciado!');
                            } catch (error) {
                              logError('❌ Erro no download:', error);
                              toast.error('Erro ao baixar anexo');
                            }
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        {(actions || canDelete) && (
          <div className="pt-2 border-t flex justify-between items-center gap-2">
            <div className="flex-1">
              {actions}
            </div>
            {canDelete && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(nf.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}