// Provider desabilitado para evitar memory leaks
import React from "react";

interface RealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider global para realtime - DESABILITADO para evitar memory leaks
 */
export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  // Completamente desabilitado
  return <>{children}</>;
}