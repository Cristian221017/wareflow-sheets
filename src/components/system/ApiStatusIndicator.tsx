import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type ApiStatus = 'connected' | 'disconnected' | 'checking' | 'error';

export function ApiStatusIndicator() {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [errorCount, setErrorCount] = useState(0);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkApiStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkApiStatus = async () => {
    try {
      setStatus('checking');
      
      // Simple health check - try to get session
      const { data, error } = await supabase.auth.getSession();
      
      if (error && error.message.includes('Invalid API key')) {
        setStatus('error');
        setErrorCount(prev => prev + 1);
      } else {
        setStatus('connected');
        setErrorCount(0);
      }
      
      setLastCheck(new Date());
    } catch (error) {
      setStatus('disconnected');
      setErrorCount(prev => prev + 1);
      setLastCheck(new Date());
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'bg-green-500',
          text: 'API Conectada',
          variant: 'default' as const
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-500',
          text: 'Erro na API',
          variant: 'outline' as const
        };
      case 'disconnected':
        return {
          icon: XCircle,
          color: 'bg-red-500',
          text: 'API Desconectada',
          variant: 'destructive' as const
        };
      case 'checking':
      default:
        return {
          icon: AlertTriangle,
          color: 'bg-gray-500',
          text: 'Verificando...',
          variant: 'secondary' as const
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Só mostrar se houver problemas ou em desenvolvimento
  if (status === 'connected' && import.meta.env.MODE === 'production') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Alert className="w-auto">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <span>{config.text}</span>
            
            <Badge variant={config.variant} className="text-xs">
              <div className={`w-2 h-2 rounded-full ${config.color} mr-1`} />
              {status === 'error' && errorCount > 0 && ` (${errorCount} erros)`}
            </Badge>
            
            {lastCheck && (
              <span className="text-xs text-muted-foreground">
                {lastCheck.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </div>
        
        {status === 'error' && (
          <div className="mt-2 text-xs text-muted-foreground">
            Problemas de autenticação detectados. Verifique as configurações da API.
          </div>
        )}
      </Alert>
    </div>
  );
}