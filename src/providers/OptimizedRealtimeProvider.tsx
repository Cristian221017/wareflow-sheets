import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimizedRealtimeManager } from "@/lib/optimizedRealtimeManager";
import { log } from "@/utils/optimizedLogger";
import { useMemoryCleanup } from "@/utils/memoryManager";

interface OptimizedRealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider otimizado para realtime - melhor performance e memory management
 * - Usa debouncing para invalidações
 * - Memory management automático
 * - Métricas de performance
 * - Reconexão inteligente
 */
export default function OptimizedRealtimeProvider({ children }: OptimizedRealtimeProviderProps) {
  const queryClient = useQueryClient();
  const { addCleanup } = useMemoryCleanup();

  useEffect(() => {
    log('🌐 OptimizedRealtimeProvider desabilitado temporariamente para debug');
    
    // Desabilitar realtime temporariamente para evitar loops de erro
    // const cleanup = useOptimizedRealtimeManager(queryClient, 'global-optimized-provider');
    // const removeCleanup = addCleanup(cleanup);
    
    return () => {
      log('🌐 Limpando OptimizedRealtimeProvider');
      // removeCleanup();
    };
  }, [queryClient, addCleanup]);

  return <>{children}</>;
}