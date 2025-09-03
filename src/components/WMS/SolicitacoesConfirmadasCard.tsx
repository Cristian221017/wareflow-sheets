import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Package, MapPin, Truck, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NotaFiscal } from '@/types/nf';
import { AnexarDocumentosSolicitacao } from './AnexarDocumentosSolicitacao';
import { DocumentosAnexadosViewer } from './DocumentosAnexadosViewer';
import { StatusSeparacaoManager } from './StatusSeparacaoManager';
import { useAuth } from '@/contexts/AuthContext';

interface SolicitacoesConfirmadasCardProps {
  nf: NotaFiscal;
  onRefresh?: () => void;
}

export function SolicitacoesConfirmadasCard({ nf, onRefresh }: SolicitacoesConfirmadasCardProps) {
  const { user } = useAuth();
  const isTransportadora = user?.type === 'transportadora';

  const getStatusSeparacaoColor = (status: string) => {
    switch (status) {
      case 'separacao_concluida':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'separacao_andamento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pendente':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusSeparacaoText = (status: string) => {
    switch (status) {
      case 'separacao_concluida':
        return 'Separação Concluída';
      case 'separacao_andamento':
        return 'Em Separação';
      case 'pendente':
      default:
        return 'Separação Pendente';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-primary">
              NF {nf.numero_nf}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>{nf.produto}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              CONFIRMADA
            </Badge>
            <Badge variant="outline" className={getStatusSeparacaoColor(nf.status_separacao || 'pendente')}>
              {getStatusSeparacaoText(nf.status_separacao || 'pendente')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fornecedor:</span>
              <span className="font-medium">{nf.fornecedor}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-medium">{nf.quantidade}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Localização:</span>
              <span className="font-medium">{nf.localizacao}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Recebimento:</span>
              <span className="font-medium">
                {format(new Date(nf.data_recebimento), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>

            {nf.data_agendamento_entrega && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Agendamento:</span>
                <span className="font-medium text-primary">
                  {format(new Date(nf.data_agendamento_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Peso/Volume:</span>
              <span className="font-medium">{nf.peso}kg / {nf.volume}m³</span>
            </div>
          </div>
        </div>

        {/* Observações da solicitação */}
        {nf.observacoes_solicitacao && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-blue-800">Observações da Solicitação:</span>
                <p className="text-sm text-blue-700 mt-1">{nf.observacoes_solicitacao}</p>
              </div>
            </div>
          </div>
        )}

        {/* Documentos anexados */}
        {nf.documentos_anexos && nf.documentos_anexos.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <DocumentosAnexadosViewer
              documentos={nf.documentos_anexos}
              nfNumero={nf.numero_nf}
              showTitle={true}
              compact={false}
            />
          </div>
        )}

        {/* Status de Separação */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status de Separação:</span>
            </div>
            <StatusSeparacaoManager
              nfId={nf.id}
              statusAtual={nf.status_separacao || 'pendente'}
              numeroNf={nf.numero_nf}
              canEdit={isTransportadora}
              onStatusChanged={onRefresh}
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Só transportadoras podem anexar documentos */}
          {isTransportadora && (
            <AnexarDocumentosSolicitacao
              nf={nf}
              onDocumentosAnexados={onRefresh}
            />
          )}

          {/* Informação sobre documentos para clientes */}
          {!isTransportadora && nf.documentos_anexos && nf.documentos_anexos.length === 0 && (
            <div className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Aguardando anexo de documentos pela transportadora</span>
            </div>
          )}

          {/* Contador de documentos */}
          {nf.documentos_anexos && nf.documentos_anexos.length > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Download className="w-3 h-3 mr-1" />
              {nf.documentos_anexos.length} documento(s) disponível(is)
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}