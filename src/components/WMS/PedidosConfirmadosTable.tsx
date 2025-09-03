import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNFs } from "@/hooks/useNFs";
import { useNFsCliente } from "@/hooks/useNFsCliente";
import { useLastVisit } from '@/hooks/useLastVisit';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Printer, Download, Truck, Paperclip } from "lucide-react";
import { DocumentosAnexadosViewer } from './DocumentosAnexadosViewer';
import { NFFilters, type NFFilterState } from "@/components/NfLists/NFFilters";
import { NFCard } from "@/components/NfLists/NFCard";
import { ConfirmarEventoDialog } from "./ConfirmarEventoDialog";
import { StatusSeparacaoManager } from "./StatusSeparacaoManager";
import { AnexarDocumentosDialog } from "./AnexarDocumentosDialog";
import { useNFEventosMutations } from "@/hooks/useNFEventos";
import { useInvalidateAll } from "@/hooks/useInvalidateAll";
import type { NotaFiscal } from "@/types/nf";
import { log, error as logError } from "@/utils/logger";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

export function PedidosConfirmadosTable() {
  const { user } = useAuth();
  const once = useRef(false);
  const { markVisitForComponent } = useLastVisit();
  const { invalidateAll } = useInvalidateAll();
  const isCliente = user?.type === "cliente";
  const isTransportadora = user?.role === "admin_transportadora" || user?.role === "operador";
  const { confirmarEmbarque } = useNFEventosMutations();
  
  // Estados para dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNF, setSelectedNF] = useState<NotaFiscal | null>(null);
  const { data: nfs, isLoading, isError, refetch } = isCliente ? useNFsCliente("CONFIRMADA") : useNFs("CONFIRMADA");

  // Estados para filtros
  const [filters, setFilters] = useState<NFFilterState>({
    searchNF: "",
    searchPedido: "",
    cliente: "all",
    produto: "",
    fornecedor: "",
    dataInicio: "",
    dataFim: "",
    localizacao: "",
    statusSeparacao: "all",
  });

  // Configurar realtime centralizado
  // Apenas marcar a visita (limpa badges imediatamente). Realtime é global.
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    log("👀 Visit PedidosConfirmadosTable");
    markVisitForComponent('nfs-confirmadas');
  }, [markVisitForComponent]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar dados</p>
      </div>
    );
  }

  const validNfs = Array.isArray(nfs) ? nfs : [];

  if (validNfs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Carregamentos Confirmados</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe os carregamentos que foram confirmados e aprovados
          </p>
        </div>

        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Nenhum carregamento confirmado</h3>
          <p className="text-sm">Os carregamentos confirmados aparecerão aqui</p>
        </div>
      </div>
    );
  }

  // Função para filtrar NFs
  const applyFilters = (nfs: NotaFiscal[]) => {
    return nfs.filter((nf) => {
      if (
        filters.searchNF &&
        !nf.numero_nf.toLowerCase().includes(filters.searchNF.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.searchPedido &&
        !nf.numero_pedido.toLowerCase().includes(filters.searchPedido.toLowerCase())
      ) {
        return false;
      }
      if (filters.cliente && filters.cliente !== 'all' && nf.cliente_id !== filters.cliente) {
        return false;
      }
      if (
        filters.produto &&
        !nf.produto.toLowerCase().includes(filters.produto.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.fornecedor &&
        !nf.fornecedor.toLowerCase().includes(filters.fornecedor.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.localizacao &&
        !nf.localizacao?.toLowerCase().includes(filters.localizacao.toLowerCase())
      ) {
        return false;
      }
      if (filters.dataInicio || filters.dataFim) {
        const nfDate = new Date(nf.data_recebimento);
        if (filters.dataInicio) {
          const startDate = new Date(filters.dataInicio);
          if (nfDate < startDate) return false;
        }
        if (filters.dataFim) {
          const endDate = new Date(filters.dataFim);
          endDate.setHours(23, 59, 59, 999);
          if (nfDate > endDate) return false;
        }
      }
      return true;
    });
  };

  const filteredNfs = applyFilters(validNfs);

  // Função para imprimir relatório
  const handleImprimir = () => {
    const hoje = new Date();
    const dataHoraImpressao = hoje.toLocaleString('pt-BR');
    
    const filtrosAplicados = [];
    if (filters.searchNF) filtrosAplicados.push(`NF: ${filters.searchNF}`);
    if (filters.searchPedido) filtrosAplicados.push(`Pedido: ${filters.searchPedido}`);
    if (filters.cliente && filters.cliente !== 'all') filtrosAplicados.push(`Cliente: ${filters.cliente}`);
    if (filters.produto) filtrosAplicados.push(`Produto: ${filters.produto}`);
    if (filters.fornecedor) filtrosAplicados.push(`Fornecedor: ${filters.fornecedor}`);
    if (filters.localizacao) filtrosAplicados.push(`Localização: ${filters.localizacao}`);
    if (filters.dataInicio) filtrosAplicados.push(`Data início: ${new Date(filters.dataInicio).toLocaleDateString('pt-BR')}`);
    if (filters.dataFim) filtrosAplicados.push(`Data fim: ${new Date(filters.dataFim).toLocaleDateString('pt-BR')}`);

    let html = `
      <html>
        <head>
          <title>Relatório de Carregamentos Confirmados</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .filters { margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
            .summary { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Carregamentos Confirmados</h1>
            <p>Gerado em: ${dataHoraImpressao}</p>
          </div>
    `;

    if (filtrosAplicados.length > 0) {
      html += `
        <div class="filters">
          <strong>Filtros aplicados:</strong> ${filtrosAplicados.join(', ')}
        </div>
      `;
    }

    const totalPeso = filteredNfs.reduce((sum, nf) => sum + Number(nf.peso || 0), 0);
    const totalVolume = filteredNfs.reduce((sum, nf) => sum + Number(nf.volume || 0), 0);
    const totalQuantidade = filteredNfs.reduce((sum, nf) => sum + Number(nf.quantidade || 0), 0);

    html += `
      <div class="summary">
        <h3>Resumo</h3>
        <p><strong>Total de carregamentos confirmados:</strong> ${filteredNfs.length}</p>
        <p><strong>Peso total:</strong> ${totalPeso.toLocaleString('pt-BR')} kg</p>
        <p><strong>Volume total:</strong> ${totalVolume.toLocaleString('pt-BR')} m³</p>
        <p><strong>Quantidade total:</strong> ${totalQuantidade.toLocaleString('pt-BR')} unidades</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>NF</th>
            <th>Pedido</th>
            <th>Produto</th>
            <th>Fornecedor</th>
            <th>Quantidade</th>
            <th>Peso (kg)</th>
            <th>Volume (m³)</th>
            <th>Localização</th>
            <th>Data Receb.</th>
            <th>Status Separação</th>
            <th>Agendamento</th>
            <th>Observações</th>
            <th>Documentos</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredNfs.forEach(nf => {
      // Melhorada: buscar dados de agendamento da solicitação OU da NF
      let agendamento = 'Não informado';
      let observacoes = 'Nenhuma';
      let documentos = 'Nenhum';

      // Primeiro, verificar se há dados diretamente na NF (dados herdados da solicitação)
      if (nf.data_agendamento_entrega) {
        agendamento = new Date(nf.data_agendamento_entrega).toLocaleDateString('pt-BR');
      }
      if (nf.observacoes_solicitacao) {
        observacoes = nf.observacoes_solicitacao;
      }
      if (nf.documentos_anexos?.length) {
        documentos = `${nf.documentos_anexos.length} arquivo(s)`;
      }
      
      html += `
        <tr>
          <td>${nf.numero_nf}</td>
          <td>${nf.numero_pedido}</td>
          <td>${nf.produto}</td>
          <td>${nf.fornecedor}</td>
          <td>${Number(nf.quantidade).toLocaleString('pt-BR')}</td>
          <td>${Number(nf.peso).toLocaleString('pt-BR')}</td>
          <td>${Number(nf.volume).toLocaleString('pt-BR')}</td>
          <td>${nf.localizacao}</td>
          <td>${new Date(nf.data_recebimento).toLocaleDateString('pt-BR')}</td>
          <td>${nf.status_separacao || 'Pendente'}</td>
          <td style="font-weight: ${agendamento !== 'Não informado' ? 'bold' : 'normal'}; color: ${agendamento !== 'Não informado' ? '#059669' : '#6b7280'}">${agendamento}</td>
          <td style="max-width: 200px; word-wrap: break-word;">${observacoes}</td>
          <td style="font-weight: ${documentos !== 'Nenhum' ? 'bold' : 'normal'}; color: ${documentos !== 'Nenhum' ? '#059669' : '#6b7280'}">${documentos}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="footer">
        <p>Relatório gerado pelo Sistema WMS</p>
      </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast.success("Relatório enviado para impressão!");
  };

  // Função para exportar CSV
  const handleExportar = () => {
    const headers = [
      'NF', 'Pedido', 'Produto', 'Fornecedor', 'Quantidade', 
      'Peso (kg)', 'Volume (m³)', 'Localização', 'Data Recebimento', 'Status Separação',
      'Agendamento', 'Observações', 'Documentos'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredNfs.map(nf => {
        // Melhorada: buscar dados de agendamento da solicitação OU da NF
        let agendamento = 'Não informado';
        let observacoes = 'Nenhuma';
        let documentos = 'Nenhum';

        // Primeiro, verificar se há dados diretamente na NF (dados herdados da solicitação)
        if (nf.data_agendamento_entrega) {
          agendamento = new Date(nf.data_agendamento_entrega).toLocaleDateString('pt-BR');
        }
        if (nf.observacoes_solicitacao) {
          observacoes = nf.observacoes_solicitacao;
        }
        if (nf.documentos_anexos?.length) {
          documentos = `${nf.documentos_anexos.length} arquivo(s)`;
        }
        
        return [
          nf.numero_nf,
          nf.numero_pedido,
          `"${nf.produto}"`,
          `"${nf.fornecedor}"`,
          nf.quantidade,
          nf.peso,
          nf.volume,
          `"${nf.localizacao}"`,
          new Date(nf.data_recebimento).toLocaleDateString('pt-BR'),
          nf.status_separacao || 'Pendente',
          `"${agendamento}"`,
          `"${observacoes}"`,
          `"${documentos}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `carregamentos-confirmados-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  // Função para abrir dialog de confirmar embarque
  const handleConfirmarEmbarque = (nf: NotaFiscal) => {
    setSelectedNF(nf);
    setDialogOpen(true);
  };

  // Função para confirmar embarque
  const handleEmbarqueConfirmado = async (data: {
    data?: Date;
    observacoes?: string;
    anexos?: File[];
  }) => {
    if (!selectedNF) return;
    
    try {
      await confirmarEmbarque.mutateAsync({
        nfId: selectedNF.id,
        data: data.data,
        observacoes: data.observacoes,
        anexos: data.anexos || []
      });
      setDialogOpen(false);
      setSelectedNF(null);
    } catch (error) {
      logError('Erro ao confirmar embarque:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Carregamentos Confirmados</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe os carregamentos que foram confirmados e aprovados
        </p>
      </div>

      {/* Filtros */}
      <NFFilters
        filters={filters}
        onFiltersChange={setFilters}
        showClientFilter={isTransportadora}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Carregamentos Confirmados
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredNfs.length}
                {validNfs.length !== filteredNfs.length && ` de ${validNfs.length}`}
              </Badge>
              {filteredNfs.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={handleImprimir} variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button onClick={handleExportar} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNfs.length > 0 ? (
            <div className="space-y-3">
              {filteredNfs.map((nf) => (
                <div key={nf.id} className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <NFCard
                        nf={nf}
                        showApprovalInfo
                        showRequestInfo={true} // Mostrar informações de agendamento
                        showSelection={false} // Confirmadas não precisam de seleção
                      />
                    </div>
                    
                    {/* Ações da Transportadora */}
                    {isTransportadora && (
                      <div className="flex flex-col gap-2">
                         {/* Status de Separação com edição */}
                         <StatusSeparacaoManager
                           nfId={nf.id}
                           statusAtual={nf.status_separacao || 'pendente'}
                           numeroNf={nf.numero_nf}
                           canEdit={true}
                            onStatusChanged={async () => {
                              // Invalidação + refetch forçado para sincronização imediata
                              invalidateAll();
                              await refetch();
                            }}
                         />
                        
                        {/* Documentos anexados (se houver) */}
                        {(() => {
                          console.log('🔍 PedidosConfirmadosTable - Verificando documentos para NF:', {
                            nfId: nf.id,
                            numeroNf: nf.numero_nf,
                            documentos_anexos: nf.documentos_anexos,
                            temDocumentos: !!(nf.documentos_anexos && nf.documentos_anexos.length > 0),
                            quantidadeDocumentos: nf.documentos_anexos?.length || 0
                          });
                          
                          return nf.documentos_anexos && nf.documentos_anexos.length > 0 ? (
                            <DocumentosAnexadosViewer 
                              documentos={nf.documentos_anexos}
                              nfNumero={nf.numero_nf}
                              showTitle={true}
                              compact={false}
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Nenhum documento anexado
                            </div>
                          );
                        })()}
                        
                        {/* Anexar Documentos */}
                        <AnexarDocumentosDialog 
                          nf={nf}
                          onDocumentosAnexados={async () => {
                            console.log('🚨🚨🚨 CALLBACK EXECUTADO - INÍCIO 🚨🚨🚨');
                            console.log('🔄 CALLBACK onDocumentosAnexados disparado para NF:', nf.id);
                            console.log('🔄 Estado atual da NF antes do refetch:', {
                              nfId: nf.id,
                              documentosAtuais: nf.documentos_anexos?.length || 0,
                              estruturaAtual: JSON.stringify(nf.documentos_anexos, null, 2)
                            });
                            
                           // Buscar dados diretamente da base para comparar
                            console.log('🔍 Buscando dados diretamente da base de dados...');
                            try {
                              const { data: nfAtualizada, error } = await supabase
                                .from('notas_fiscais')
                                .select('id, numero_nf, documentos_anexos')
                                .eq('id', nf.id)
                                .single();
                              
                              if (error) {
                                console.error('❌ Erro ao buscar NF atualizada:', error);
                              } else {
                                console.log('📊 Dados na base após anexo:', {
                                  documentosNaBase: (nfAtualizada as any)?.documentos_anexos?.length || 0,
                                  estruturaNaBase: JSON.stringify((nfAtualizada as any)?.documentos_anexos, null, 2)
                                });
                              }
                            } catch (e) {
                              console.error('❌ Erro na busca direta:', e);
                            }
                            
                            // Forçar reload completo dos dados
                            console.log('🔄 Invalidando cache e recarregando...');
                            invalidateAll();
                            const result = await refetch();
                            console.log('🔄 Resultado do primeiro refetch:', result);
                            
                            // Pequeno delay para garantir sincronização
                            setTimeout(async () => {
                              console.log('🔄 Segundo refetch após delay...');
                              const result2 = await refetch();
                              console.log('🔄 Resultado do segundo refetch:', result2);
                            }, 100);
                          }}
                        />
                        
                        {/* Botão Confirmar Embarque apenas se ainda não foi embarcado */}
                        {!(nf as any).data_embarque && (
                          <Button
                            onClick={() => handleConfirmarEmbarque(nf)}
                            variant="outline"
                            size="sm"
                            className="min-w-[140px] gap-2"
                          >
                            <Truck className="w-4 h-4" />
                            Confirmar Embarque
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Informações para Cliente */}
                    {isCliente && (
                      <div className="flex flex-col gap-2 items-end">
                        {/* Status de Separação (somente leitura) */}
                        <StatusSeparacaoManager
                          nfId={nf.id}
                          statusAtual={nf.status_separacao || 'pendente'}
                          numeroNf={nf.numero_nf}
                          canEdit={false}
                        />
                        
                        {/* Documentos anexados (se houver) */}
                        {nf.documentos_anexos && nf.documentos_anexos.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Paperclip className="w-4 h-4" />
                            {nf.documentos_anexos.length} documento(s)
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Indicador de embarque confirmado */}
                    {(nf as any).data_embarque && (
                      <div className="flex flex-col items-center gap-1 p-2 bg-green-50 rounded-lg border border-green-200">
                        <Truck className="w-5 h-5 text-green-600" />
                        <span className="text-xs text-green-700 font-medium">Embarcado</span>
                        <span className="text-xs text-green-600">
                          {new Date((nf as any).data_embarque).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Informações adicionais da solicitação original - apenas para transportadoras */}
                  {!isCliente && (nf.data_agendamento_entrega || nf.observacoes_solicitacao || nf.documentos_anexos?.length > 0) && (
                    <div className="pl-4 border-l-2 border-primary/20 bg-muted/30 rounded-r p-3">
                      <h4 className="text-sm font-medium text-primary mb-2">Informações da Solicitação Original:</h4>
                      
                      {nf.data_agendamento_entrega && (
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium">Data de Agendamento:</span>{' '}
                          {new Date(nf.data_agendamento_entrega).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      
                      {nf.observacoes_solicitacao && (
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium">Observações:</span> {nf.observacoes_solicitacao}
                        </p>
                      )}
                      
                      {(() => {
                        console.log('🔍 PedidosConfirmadosTable - Verificando documentos para NF:', {
                          nfId: nf.id,
                          numeroNf: nf.numero_nf,
                          documentos_anexos: nf.documentos_anexos,
                          temDocumentos: !!(nf.documentos_anexos && nf.documentos_anexos.length > 0),
                          quantidadeDocumentos: nf.documentos_anexos?.length || 0,
                          estruturaCompleta: JSON.stringify(nf.documentos_anexos, null, 2)
                        });
                        
                        return nf.documentos_anexos && Array.isArray(nf.documentos_anexos) && nf.documentos_anexos.length > 0 ? (
                          <DocumentosAnexadosViewer 
                            documentos={nf.documentos_anexos}
                            nfNumero={nf.numero_nf}
                            showTitle={true}
                            compact={false}
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Nenhum documento anexado (total: {nf.documentos_anexos?.length || 0})
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : validNfs.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum carregamento confirmado encontrado com os filtros aplicados</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Footer com informações */}
      <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">🔄 Atualizações em tempo real ativas</p>
        <p>As mudanças são refletidas automaticamente sem necessidade de recarregar a página</p>
      </div>

      {/* Dialog para confirmar embarque */}
      <ConfirmarEventoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleEmbarqueConfirmado}
        title="Confirmar Embarque"
        description="Registre os detalhes do embarque da mercadoria"
        nfInfo={selectedNF ? {
          numero_nf: selectedNF.numero_nf,
          cliente_nome: `Cliente ID: ${selectedNF.cliente_id}`, // Cliente identifier
        } : undefined}
        isPending={confirmarEmbarque.isPending}
      />
    </div>
  );
}