import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Download, Clock, CheckCircle, X } from "lucide-react";
import { useSolicitacoesCliente } from "@/hooks/useSolicitacoes";
import { getAnexoUrl } from "@/lib/nfApi";
import { toast } from "sonner";

export function MinhasSolicitacoes() {
  const { data: solicitacoes, isLoading } = useSolicitacoesCliente();

  const handleDownloadAnexo = async (anexo: any) => {
    try {
      const url = await getAnexoUrl(anexo.path);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Erro ao baixar anexo');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'APROVADA': return 'bg-green-100 text-green-800 border-green-300';
      case 'RECUSADA': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Clock className="w-4 h-4" />;
      case 'APROVADA': return <CheckCircle className="w-4 h-4" />;
      case 'RECUSADA': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return <div className="p-6">Carregando minhas solicitações...</div>;
  }

  if (!solicitacoes || solicitacoes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Nenhuma solicitação encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Suas solicitações de carregamento aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Minhas Solicitações de Carregamento</h2>
        <Badge variant="secondary">
          {solicitacoes.length} solicitação{solicitacoes.length !== 1 ? 'ões' : ''}
        </Badge>
      </div>

      <div className="grid gap-4">
        {solicitacoes.map((solicitacao: any) => (
          <Card key={solicitacao.id} className="w-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    NF {solicitacao.notas_fiscais?.numero_nf}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Produto: {solicitacao.notas_fiscais?.produto}
                  </p>
                </div>
                <Badge className={`${getStatusColor(solicitacao.status)} flex items-center gap-1`}>
                  {getStatusIcon(solicitacao.status)}
                  {solicitacao.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Pedido:</span>
                  <p className="font-medium">{solicitacao.notas_fiscais?.numero_pedido}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ordem de Compra:</span>
                  <p className="font-medium">{solicitacao.notas_fiscais?.ordem_compra}</p>
                </div>
              </div>

              {/* Data de agendamento */}
              {solicitacao.data_agendamento && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-sm font-medium text-primary">
                      Data agendada para entrega:
                    </span>
                    <p className="text-sm">
                      {new Date(solicitacao.data_agendamento).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Observações */}
              {solicitacao.observacoes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Observações:</span>
                  <p className="text-sm mt-1">{solicitacao.observacoes}</p>
                </div>
              )}

              {/* Anexos */}
              {solicitacao.anexos && Array.isArray(solicitacao.anexos) && solicitacao.anexos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Documentos anexados ({solicitacao.anexos.length}):
                  </span>
                  <div className="space-y-2">
                    {solicitacao.anexos.map((anexo: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{anexo.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({((anexo.size || 0) / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadAnexo(anexo)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações de timing */}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>
                  Solicitado em: {' '}
                  {new Date(solicitacao.requested_at).toLocaleString('pt-BR')}
                </p>
                {solicitacao.approved_at && (
                  <p>
                    {solicitacao.status === 'APROVADA' ? 'Aprovado' : 'Recusado'} em: {' '}
                    {new Date(solicitacao.approved_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}