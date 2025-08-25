import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TestTube, AlertTriangle } from 'lucide-react';
import { useEnvironment } from '@/hooks/useEnvironment';

export function EnvironmentBadge() {
  const { env, ui, isTest } = useEnvironment();

  if (!isTest) return null;

  return (
    <Alert className="bg-yellow-50 border-yellow-200 mb-4">
      <TestTube className="w-4 h-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            AMBIENTE DE TESTE
          </Badge>
          <span className="text-yellow-800 font-medium">
            Este é o ambiente de testes. Dados podem ser alterados sem impacto na produção.
          </span>
        </div>
        <span className="text-xs text-yellow-600">
          Funcionalidades experimentais habilitadas
        </span>
      </AlertDescription>
    </Alert>
  );
}

// Componente para mostrar no header
export function EnvironmentIndicator() {
  const { env, ui, isTest } = useEnvironment();

  if (!isTest) return null;

  return (
    <div className="text-center py-1 px-3 bg-yellow-400 text-yellow-900 text-sm font-medium">
      🧪 AMBIENTE DE TESTE - {ui.title}
    </div>
  );
}