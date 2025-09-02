// System Status Component - Shows current system health
import React, { useState, useEffect } from 'react';
import { systemStabilizer } from '@/utils/systemStabilizer';
import productionLogger from '@/utils/productionOptimizedLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Activity, Trash2 } from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loggerStats, setLoggerStats] = useState<any>(null);

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const updateStatus = () => {
    setStatus(systemStabilizer.getStatus());
    setLoggerStats(productionLogger.getBufferStats());
  };

  const clearLogs = () => {
    if (typeof console.clear === 'function') {
      console.clear();
    }
    updateStatus();
  };

  if (!status) return null;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">
              Estabilizador: 
              <Badge variant="secondary" className="ml-2">
                {status.initialized ? 'Ativo' : 'Inativo'}
              </Badge>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <span className="text-sm">
              Ambiente: 
              <Badge variant="outline" className="ml-2">
                {status.environment}
              </Badge>
            </span>
          </div>
        </div>

        {loggerStats && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Logger Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                Buffer: {loggerStats.bufferSize}/{loggerStats.maxBufferSize}
              </div>
              <div>
                Modo Dev: {loggerStats.isDevelopment ? 'Sim' : 'Não'}
              </div>
            </div>
            
            {loggerStats.entries && loggerStats.entries.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium mb-2">Últimas Entradas:</h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {loggerStats.entries.map((entry: any, index: number) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      <span className="font-mono">[{entry.level}]</span> {entry.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Problemas Resolvidos</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Warnings de recursos (vr, ambient-light-sensor, battery)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Warnings de iframe sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Erros 429 do Sentry (bloqueados)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Erros "deferred DOM Node"</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>React Hook order warnings</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button size="sm" onClick={updateStatus} variant="outline">
            Atualizar Status
          </Button>
          <Button size="sm" onClick={clearLogs} variant="outline">
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar Console
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Última atualização: {new Date(status.timestamp).toLocaleTimeString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatus;