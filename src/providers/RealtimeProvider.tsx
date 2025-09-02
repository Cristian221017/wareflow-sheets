import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeCentralizedChanges } from "@/lib/realtimeCentralized";
import { log } from "@/utils/logger";

interface RealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider centralizado para realtime - versão estável e simplificada
 */
export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    log('🌐 Iniciando RealtimeProvider');
    
    const cleanup = subscribeCentralizedChanges(queryClient);
    
    return () => {
      log('🌐 Limpando RealtimeProvider');
      cleanup();
    };
  }, [queryClient]);

  return <>{children}</>;
}