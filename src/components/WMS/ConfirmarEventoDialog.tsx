import { useState } from 'react';
import { Calendar, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConfirmarEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    data?: Date;
    observacoes?: string;
    anexos?: File[];
  }) => void;
  isPending?: boolean;
  title: string;
  description: string;
  nfInfo?: {
    numero_nf: string;
    cliente_nome?: string;
  };
}

export function ConfirmarEventoDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  title,
  description,
  nfInfo
}: ConfirmarEventoDialogProps) {
  const [data, setData] = useState(new Date());
  const [observacoes, setObservacoes] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      data,
      observacoes: observacoes.trim() || undefined,
      anexos: anexos.length > 0 ? anexos : undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAnexos(prev => [...prev, ...files]);
  };

  const removeAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setData(new Date());
    setObservacoes('');
    setAnexos([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isPending) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            {nfInfo && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-sm font-medium">NF: {nfInfo.numero_nf}</p>
                {nfInfo.cliente_nome && (
                  <p className="text-sm text-muted-foreground">Cliente: {nfInfo.cliente_nome}</p>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data e Hora</Label>
            <Input
              id="data"
              type="datetime-local"
              value={format(data, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setData(new Date(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite observações adicionais..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anexos">Anexos (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="anexos"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {anexos.length > 0 && (
              <div className="mt-2 space-y-1">
                {anexos.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAnexo(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}