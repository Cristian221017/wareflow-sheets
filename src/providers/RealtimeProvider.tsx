import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeCentralizedChanges } from "@/lib/realtimeCentralized";
import { log } from "@/utils/logger";

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
    log('🌐 Iniciando Realtime Provider global');
    const cleanup = subscribeCentralizedChanges(queryClient);
    
    return () => {
      log('🌐 Limpando Realtime Provider global');
      cleanup?.();
    };
  }, [queryClient]);

  return <>{children}</>;
}