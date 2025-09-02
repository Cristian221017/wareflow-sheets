import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DoubleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  variant?: 'destructive' | 'default';
}

export function DoubleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  variant = 'destructive'
}: DoubleConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [inputValue, setInputValue] = useState('');
  const expectedText = 'CONFIRMAR';

  const handleClose = () => {
    setStep(1);
    setInputValue('');
    onOpenChange(false);
  };

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    if (inputValue.toUpperCase() === expectedText) {
      onConfirm();
      handleClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${variant === 'destructive' ? 'text-destructive' : ''}`} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === 1 ? description : 'Para confirmar definitivamente a exclusão, digite "CONFIRMAR" no campo abaixo:'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {step === 2 && (
          <div className="space-y-2">
            <Label htmlFor="confirm-input">Digite "CONFIRMAR" para prosseguir</Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="CONFIRMAR"
              className="font-mono"
            />
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            Cancelar
          </AlertDialogCancel>
          {step === 1 ? (
            <Button 
              variant={variant}
              onClick={handleFirstConfirm}
            >
              {confirmText}
            </Button>
          ) : (
            <Button
              variant={variant}
              onClick={handleFinalConfirm}
              disabled={inputValue.toUpperCase() !== expectedText}
            >
              Confirmar Exclusão
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}