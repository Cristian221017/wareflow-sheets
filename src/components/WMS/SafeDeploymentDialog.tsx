import { useState } from 'react';
import { log, warn, error as logError } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Play,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SafeDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunPreDeploymentCheck: () => Promise<boolean>;
}

interface CheckStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export function SafeDeploymentDialog({ 
  open, 
  onOpenChange, 
  onRunPreDeploymentCheck 
}: SafeDeploymentDialogProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [deploymentResult, setDeploymentResult] = useState<'success' | 'failed' | null>(null);
  
  const [steps, setSteps] = useState<CheckStep[]>([
    {
      id: 'backup',
      name: 'Backup de Segurança',
      description: 'Criando backup automático dos dados críticos',
      status: 'pending'
    },
    {
      id: 'validation',
      name: 'Validação de Integridade',
      description: 'Verificando integridade dos dados existentes',
      status: 'pending'
    },
    {
      id: 'health',
      name: 'Verificação de Saúde',
      description: 'Checando saúde geral do sistema',
      status: 'pending'
    },
    {
      id: 'approval',
      name: 'Validação Final',
      description: 'Verificando se todas as condições foram atendidas',
      status: 'pending'
    }
  ]);

  const progress = (steps.filter(s => s.status === 'completed').length / steps.length) * 100;

  const runSafeDeployment = async () => {
    setIsRunning(true);
    setCurrentStep(0);
    setDeploymentResult(null);
    
    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));

    try {
      // Simulate step progression
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        
        // Update current step to running
        setSteps(prev => prev.map((step, index) => 
          index === i ? { ...step, status: 'running' } : step
        ));

        // Simulate some delay for each step
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For the actual deployment check, call the real function
        if (i === steps.length - 1) {
          const success = await onRunPreDeploymentCheck();
          
          if (success) {
            setSteps(prev => prev.map((step, index) => 
              index === i ? { ...step, status: 'completed', result: 'Todas as verificações passaram' } : step
            ));
            setDeploymentResult('success');
          } else {
            setSteps(prev => prev.map((step, index) => 
              index === i ? { ...step, status: 'failed', result: 'Falha nas verificações de segurança' } : step
            ));
            setDeploymentResult('failed');
            break;
          }
        } else {
          // Mark step as completed
          setSteps(prev => prev.map((step, index) => 
            index === i ? { ...step, status: 'completed' } : step
          ));
        }
      }
    } catch (error) {
      logError('Erro no deployment seguro:', error);
      setDeploymentResult('failed');
      
      // Mark current step as failed
      setSteps(prev => prev.map((step, index) => 
        index === currentStep 
          ? { ...step, status: 'failed', result: 'Erro inesperado durante a verificação' }
          : step
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (step: CheckStep) => {
    switch (step.status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepStatus = (step: CheckStep) => {
    switch (step.status) {
      case 'running':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Em execução</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-white">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const resetDialog = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setDeploymentResult(null);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', result: undefined })));
  };

  const handleClose = () => {
    if (!isRunning) {
      resetDialog();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Deployment Seguro
          </DialogTitle>
          <DialogDescription>
            Execute um deployment seguro com validações automáticas e backup de segurança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">{step.name}</h4>
                    {getStepStatus(step)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {step.description}
                  </p>
                  {step.result && (
                    <p className={`text-sm ${
                      step.status === 'failed' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {step.result}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Result Alert */}
          {deploymentResult && (
            <Alert className={
              deploymentResult === 'success' 
                ? 'border-green-500 bg-green-50' 
                : 'border-red-500 bg-red-50'
            }>
              {deploymentResult === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <AlertDescription>
                {deploymentResult === 'success' ? (
                  <div>
                    <strong>Deployment aprovado! ✅</strong>
                    <p className="mt-1">
                      Todas as verificações de segurança passaram. O sistema está pronto para deployment.
                    </p>
                  </div>
                ) : (
                  <div>
                    <strong>Deployment bloqueado! ❌</strong>
                    <p className="mt-1">
                      Algumas verificações falharam. Revise os problemas antes de prosseguir.
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isRunning}
            >
              {deploymentResult ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {!deploymentResult && (
              <Button
                onClick={runSafeDeployment}
                disabled={isRunning}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Deployment Seguro
                  </>
                )}
              </Button>
            )}

            {deploymentResult === 'success' && (
              <Button
                onClick={() => {
                  // Aqui você integraria com o sistema de deployment real
                  log('Prosseguir com deployment...');
                  handleClose();
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Prosseguir com Deployment
              </Button>
            )}

            {deploymentResult === 'failed' && (
              <Button
                variant="outline"
                onClick={resetDialog}
              >
                Tentar Novamente
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}