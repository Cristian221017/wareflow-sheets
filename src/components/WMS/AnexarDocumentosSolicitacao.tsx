import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Paperclip, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { log, error as logError } from '@/utils/logger';
import type { NotaFiscal } from '@/types/nf';

interface AnexarDocumentosSolicitacaoProps {
  nf: NotaFiscal;
  onDocumentosAnexados?: () => void;
}

export function AnexarDocumentosSolicitacao({ nf, onDocumentosAnexados }: AnexarDocumentosSolicitacaoProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar tamanho dos arquivos (máximo 10MB cada)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: `Alguns arquivos excedem o limite de 10MB: ${invalidFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    setArquivos(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<any> => {
    if (!user?.transportadoraId) {
      throw new Error('Transportadora não identificada');
    }

    const timestamp = Date.now();
    const fileName = `solicitacao_${nf.id}_${timestamp}_${file.name}`;
    const filePath = `${user.transportadoraId}/${nf.id}/${fileName}`;

    log('📤 Fazendo upload do arquivo:', {
      arquivo: file.name,
      tamanho: file.size,
      path: filePath,
      nf: nf.numero_nf
    });

    const { data, error } = await supabase.storage
      .from('solicitacoes-anexos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      logError('Erro no upload:', error);
      throw new Error(`Erro no upload: ${error.message}`);
    }

    return {
      name: file.name,
      path: filePath,
      size: file.size,
      tipo: file.type,
      uploaded_at: new Date().toISOString()
    };
  };

  const handleAnexarDocumentos = async () => {
    if (arquivos.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para anexar",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      log('📎 Iniciando anexo de documentos à solicitação:', {
        nfId: nf.id,
        numeroNf: nf.numero_nf,
        quantidadeArquivos: arquivos.length
      });

      // Fazer upload de todos os arquivos
      const documentosUpload = await Promise.all(
        arquivos.map(arquivo => uploadFile(arquivo))
      );

      log('📦 Uploads concluídos:', documentosUpload);

      // Usar documentos existentes da NF atual
      const documentosExistentes = nf.documentos_anexos || [];
      const todosDocumentos = [...documentosExistentes, ...documentosUpload];

      // Atualizar NF com novos documentos
      const { error: updateError } = await supabase
        .from('notas_fiscais')
        .update({ 
          documentos_anexos: todosDocumentos,
          updated_at: new Date().toISOString()
        })
        .eq('id', nf.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar NF: ${updateError.message}`);
      }

      log('✅ Documentos anexados com sucesso à solicitação:', {
        nfId: nf.id,
        numeroNf: nf.numero_nf,
        documentosAdicionados: documentosUpload.length,
        totalDocumentos: todosDocumentos.length
      });

      toast({
        title: "Documentos anexados com sucesso",
        description: `${documentosUpload.length} documento(s) anexado(s) à solicitação ${nf.numero_nf}`,
        variant: "default"
      });

      // Resetar formulário
      setArquivos([]);
      setObservacoes('');
      setIsOpen(false);

      // Chamar callback se fornecido
      onDocumentosAnexados?.();

    } catch (error) {
      logError('Erro no anexo de documentos:', error);
      toast({
        title: "Erro ao anexar documentos",
        description: error instanceof Error ? error.message : "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Paperclip className="w-4 h-4" />
          Anexar Documentos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Anexar Documentos à Solicitação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações da NF */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Informações da Solicitação</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">NF:</span>
                <span className="ml-2 font-medium">{nf.numero_nf}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 font-medium">{nf.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Produto:</span>
                <span className="ml-2">{nf.produto}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Documentos existentes:</span>
                <span className="ml-2">{nf.documentos_anexos?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Seleção de arquivos */}
          <div className="space-y-2">
            <Label htmlFor="files">Selecionar Arquivos</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Máximo 10MB por arquivo. Formatos: PDF, DOC, DOCX, JPG, PNG, TXT
            </p>
          </div>

          {/* Lista de arquivos selecionados */}
          {arquivos.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados ({arquivos.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {arquivos.map((arquivo, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded border"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Upload className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{arquivo.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(arquivo.size)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre os documentos anexados..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAnexarDocumentos}
              disabled={arquivos.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Anexando {arquivos.length} arquivo(s)...
                </>
              ) : (
                <>
                  <Paperclip className="w-4 h-4 mr-2" />
                  Anexar {arquivos.length > 0 ? `${arquivos.length} arquivo(s)` : 'Documentos'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}