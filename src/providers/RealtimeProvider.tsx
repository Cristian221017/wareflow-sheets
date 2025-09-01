import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeManager } from "@/lib/realtimeManager";
import { log } from '@/utils/optimizedLogger';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider global para realtime - garante que a subscription funcione em QUALQUER tela
 * Elimina o problema de realtime parar de funcionar quando navega para fora do Dashboard
 */
export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    log('🌐 Iniciando Realtime Provider global otimizado');
    const cleanup = useRealtimeManager(queryClient, 'global-provider');
    
    return () => {
      log('🌐 Limpando Realtime Provider global');
      cleanup();
    };
  }, [queryClient]);

  return <>{children}</>;
}