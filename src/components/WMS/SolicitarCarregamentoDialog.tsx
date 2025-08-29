import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Calendar, FileText, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SolicitarCarregamentoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: SolicitacaoCarregamentoData) => void;
  numeroNF: string;
  isLoading?: boolean;
}

export interface SolicitacaoCarregamentoData {
  dataAgendamento?: string;
  observacoes?: string;
  documentos?: File[];
}

export function SolicitarCarregamentoDialog({
  isOpen,
  onClose,
  onConfirm,
  numeroNF,
  isLoading = false
}: SolicitarCarregamentoDialogProps) {
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [documentos, setDocumentos] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocumentos(prev => [...prev, ...files]);
  };

  const removeDocumento = (index: number) => {
    setDocumentos(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm({
      dataAgendamento: dataAgendamento || undefined,
      observacoes: observacoes || undefined,
      documentos: documentos.length > 0 ? documentos : undefined
    });
    
    // Limpar formulário
    setDataAgendamento('');
    setObservacoes('');
    setDocumentos([]);
  };

  const handleClose = () => {
    setDataAgendamento('');
    setObservacoes('');
    setDocumentos([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Solicitar Carregamento - NF {numeroNF}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataAgendamento" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Agendamento (Opcional)
            </Label>
            <Input
              id="dataAgendamento"
              type="date"
              value={dataAgendamento}
              onChange={(e) => setDataAgendamento(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre a solicitação..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos Anexos (Opcional)
            </Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para anexar documentos
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG
                </span>
              </label>
            </div>

            {documentos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Documentos selecionados:</Label>
                {documentos.map((doc, docIndex) => (
                  <div key={`${doc.name}-${docIndex}`} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{doc.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocumento(docIndex)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Solicitando...' : 'Confirmar Solicitação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}