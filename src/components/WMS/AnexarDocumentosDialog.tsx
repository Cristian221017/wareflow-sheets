import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { log, error as logError } from '@/utils/logger';
import type { NotaFiscal } from '@/types/nf';

interface AnexarDocumentosDialogProps {
  nf: NotaFiscal;
  onDocumentosAnexados?: () => void;
}

export function AnexarDocumentosDialog({ nf, onDocumentosAnexados }: AnexarDocumentosDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar tamanho (máximo 10MB por arquivo)
    const arquivosValidos = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    setArquivos(prev => [...prev, ...arquivosValidos]);
  };

  const removeFile = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
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
      // Upload dos arquivos para o storage
      const uploadPromises = arquivos.map(async (arquivo) => {
        const fileName = `nf_${nf.id}_${Date.now()}_${arquivo.name}`;
        const filePath = `documentos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, arquivo);

        if (uploadError) {
          throw new Error(`Erro no upload de ${arquivo.name}: ${uploadError.message}`);
        }

      return {
        name: arquivo.name,
        nome: arquivo.name,
        path: filePath,
        size: arquivo.size,
        tamanho: arquivo.size,
        tipo: arquivo.type,
        uploaded_at: new Date().toISOString()
      };
      });

      const documentosUpload = await Promise.all(uploadPromises);

      // Atualizar a NF com os novos documentos
      const documentosExistentes = nf.documentos_anexos || [];
      const novosDocumentos = [...documentosExistentes, ...documentosUpload];

      const { error: updateError } = await supabase
        .from('notas_fiscais')
        .update({
          documentos_anexos: novosDocumentos,
          updated_at: new Date().toISOString()
        })
        .eq('id', nf.id);

      if (updateError) {
        throw new Error(`Erro ao salvar documentos na NF: ${updateError.message}`);
      }

      // Log do evento
      log('📎 Documentos anexados à NF:', { 
        nfId: nf.id, 
        numeroNf: nf.numero_nf,
        quantidadeDocumentos: documentosUpload.length,
        observacoes 
      });

      toast({
        title: "Documentos anexados",
        description: `${documentosUpload.length} documento(s) anexado(s) à NF ${nf.numero_nf}`,
        variant: "default"
      });

      // Resetar form e fechar dialog
      setArquivos([]);
      setObservacoes('');
      setIsOpen(false);
      
      // Callback para atualizar lista
      if (onDocumentosAnexados) {
        onDocumentosAnexados();
      }

    } catch (error) {
      logError('Erro ao anexar documentos:', error);
      toast({
        title: "Erro ao anexar documentos",
        description: error instanceof Error ? error.message : "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Paperclip className="w-4 h-4" />
          Anexar Documentos
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anexar Documentos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              NF: {nf.numero_nf} - {nf.produto}
            </Label>
          </div>
          
          <div className="space-y-2">
            <Label>Selecionar Arquivos</Label>
            <Input
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX. Máximo 10MB por arquivo.
            </p>
          </div>

          {arquivos.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {arquivos.map((arquivo, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{arquivo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
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
          
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre os documentos anexados..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              disabled={isUploading}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAnexarDocumentos}
              disabled={isUploading || arquivos.length === 0}
            >
              {isUploading ? 'Enviando...' : `Anexar ${arquivos.length > 0 ? `(${arquivos.length})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}