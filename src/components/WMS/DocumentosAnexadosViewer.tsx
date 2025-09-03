import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Download, Eye, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { log, error as logError } from '@/utils/logger';

interface DocumentoAnexado {
  name?: string;
  nome?: string;
  path: string;
  size?: number;
  tamanho?: number;
  tipo?: string;
  contentType?: string;
  uploaded_at?: string;
}

interface DocumentosAnexadosViewerProps {
  documentos: DocumentoAnexado[];
  nfNumero: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function DocumentosAnexadosViewer({ 
  documentos, 
  nfNumero, 
  showTitle = true, 
  compact = false 
}: DocumentosAnexadosViewerProps) {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  // Normalizar documento para um formato consistente
  const normalizeDocument = (doc: DocumentoAnexado) => ({
    name: doc.name || doc.nome || 'Documento',
    path: doc.path,
    size: doc.size || doc.tamanho || 0,
    type: doc.tipo || doc.contentType || 'application/octet-stream',
    uploadedAt: doc.uploaded_at
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    return '📎';
  };

  const handleDownload = async (documento: DocumentoAnexado, index: number) => {
    const fileKey = `${documento.path}-${index}`;
    setDownloadingFiles(prev => new Set(prev).add(fileKey));

    try {
      const normalized = normalizeDocument(documento);
      
      // Detectar bucket correto baseado no path
      const bucketName = normalized.path.startsWith('documentos/') ? 'documents' : 'solicitacoes-anexos';
      
      log('📥 Tentando baixar documento:', { 
        arquivo: normalized.name, 
        path: normalized.path,
        bucket: bucketName,
        nf: nfNumero 
      });
      
      // Tentar baixar do storage
      let { data, error } = await supabase.storage
        .from(bucketName)
        .download(normalized.path);

      // Se falhou, tentar no outro bucket
      if (error) {
        const alternateBucket = bucketName === 'documents' ? 'solicitacoes-anexos' : 'documents';
        log('⚠️ Tentando bucket alternativo:', { 
          bucket_original: bucketName, 
          bucket_alternativo: alternateBucket,
          erro_original: error.message 
        });
        
        const altResult = await supabase.storage
          .from(alternateBucket)
          .download(normalized.path);
        
        data = altResult.data;
        error = altResult.error;
      }

      if (error) {
        logError('Erro no download do storage:', error);
        throw new Error(`Erro ao baixar arquivo: ${error.message || 'Erro desconhecido'}`);
      }

      if (!data) {
        throw new Error('Nenhum dado retornado do storage');
      }

      // Criar URL para download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = normalized.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      log('📥 Documento baixado com sucesso:', { 
        arquivo: normalized.name, 
        nf: nfNumero,
        tamanho: normalized.size,
        bucket: data ? bucketName : 'alternate'
      });

      toast({
        title: "Download concluído",
        description: `${normalized.name} foi baixado com sucesso`,
        variant: "default"
      });

    } catch (error) {
      logError('Erro no download do documento:', error);
      toast({
        title: "Erro no download",
        description: error instanceof Error ? error.message : "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileKey);
        return newSet;
      });
    }
  };

  if (!documentos || documentos.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Paperclip className="w-4 h-4" />
        <span>{documentos.length} documento(s) anexado(s)</span>
        <Badge variant="secondary" className="text-xs">
          {documentos.length}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            Documentos Anexados ({documentos.length})
          </span>
        </div>
      )}
      
      <div className="space-y-2">
        {documentos.map((documento, index) => {
          const normalized = normalizeDocument(documento);
          const fileKey = `${documento.path}-${index}`;
          const isDownloading = downloadingFiles.has(fileKey);
          
          return (
            <div 
              key={`${normalized.name}-${index}`}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-lg">{getFileIcon(normalized.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {normalized.name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{formatFileSize(normalized.size)}</span>
                    {normalized.uploadedAt && (
                      <>
                        <span>•</span>
                        <span>{new Date(normalized.uploadedAt).toLocaleDateString('pt-BR')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(documento, index)}
                  disabled={isDownloading}
                  className="gap-1"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Baixando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span className="text-xs">Baixar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}