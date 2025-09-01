import { supabase } from "@/integrations/supabase/client";
import { log, warn } from "@/utils/logger";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CENTRAL_CHANNEL_NAME = "wms-central-realtime";

// Singleton para evitar múltiplas subscriptions e controle de retry
let channelSingleton: RealtimeChannel | null = null;
let retryCount = 0;
const MAX_RETRY = 5;
let visibilityListener: (() => void) | null = null;
let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;

export function subscribeCentralizedChanges(queryClient: QueryClient): () => void {
  // Se já existe e está ativo, retorna cleanup que não faz nada
  if (channelSingleton) {
    log('🔒 Subscription centralizada já ativa, ignorando nova tentativa');
    return () => {}; 
  }
  
  log('🔄 Iniciando subscription realtime centralizada resiliente');
  
  const createChannel = () => {
    const channel = supabase.channel(CENTRAL_CHANNEL_NAME, {
      config: { broadcast: { ack: true } }
    });

    // Handlers para invalidação
    const handleNF = (payload: any) => {
      log('📡 Mudança detectada em notas_fiscais:', payload);
      handleNFChange(payload, queryClient);
    };

    const handleSolicitacao = (payload: any) => {
      log('📡 Mudança detectada em solicitacoes_carregamento:', payload);
      handleNFChange(payload, queryClient); // Same invalidation as NF
    };

    const handleFinanceiro = (payload: any) => {
      log('📡 Mudança detectada em documentos_financeiros:', payload);
      handleDocumentoChange(payload, queryClient);
    };

    const handleEventLog = (payload: any) => {
      log('📡 Mudança detectada em event_log:', payload);
      handleEventLogChange(payload, queryClient);
    };

    // Subscribe to all relevant tables
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_fiscais' }, handleNF)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_carregamento' }, handleSolicitacao)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos_financeiros' }, handleFinanceiro)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_log' }, handleEventLog)
      .subscribe((status) => {
        log('📡 Status da subscription centralizada:', status);
        
        if (status === 'SUBSCRIBED') {
          log('✅ Subscription realtime centralizada ativa');
          retryCount = 0; // Reset retry counter on success
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          warn('❌ Erro/fechamento do canal realtime, status:', status);
          
          // Attempt reconnection with exponential backoff
          if (retryCount < MAX_RETRY) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
            retryCount += 1;
            
            log(`🔄 Tentativa de reconexão ${retryCount}/${MAX_RETRY} em ${delay}ms`);
            
            setTimeout(() => {
              // Force recreation of channel
              if (channelSingleton) {
                supabase.removeChannel(channelSingleton);
                channelSingleton = null;
              }
              subscribeCentralizedChanges(queryClient);
            }, delay);
          } else {
            warn('❌ Máximo de tentativas de reconexão atingido');
          }
        }
      });

    return channel;
  };

  channelSingleton = createChannel();

  // Handle visibility change - resubscribe when tab comes back into focus
  visibilityListener = () => {
    if (document.visibilityState === 'visible' && channelSingleton?.state !== 'joined') {
      log('👁️ Tab voltou ao foco, verificando conexão realtime...');
      if (channelSingleton) {
        supabase.removeChannel(channelSingleton);
        channelSingleton = null;
      }
      subscribeCentralizedChanges(queryClient);
    }
  };
  document.addEventListener('visibilitychange', visibilityListener);

  // Handle auth state changes - resubscribe on token refresh
  authListener = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
      log('🔑 Token atualizado, renovando subscription realtime...');
      if (channelSingleton) {
        supabase.removeChannel(channelSingleton);
        channelSingleton = null;
      }
      subscribeCentralizedChanges(queryClient);
    }
  });

  // Retorna função de cleanup
  return () => {
    log('🔌 Desconectando subscription realtime centralizada');
    
    if (visibilityListener) {
      document.removeEventListener('visibilitychange', visibilityListener);
      visibilityListener = null;
    }
    
    if (authListener) {
      authListener.data.subscription.unsubscribe();
      authListener = null;
    }
    
    if (channelSingleton) {
      supabase.removeChannel(channelSingleton);
      channelSingleton = null;
    }
    
    retryCount = 0;
  };
}

function handleNFChange(payload: any, queryClient: QueryClient) {
  // 🎯 Invalidação por PREDICATE - cobre TODAS as variações de chave NF
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [firstKey] = query.queryKey;
      return firstKey === 'nfs' || firstKey === 'solicitacoes';
    }
  });
  
  // Dashboard sempre
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  // Log detalhado para debug
  if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
    const oldStatus = payload.old.status;
    const newStatus = payload.new.status;
    if (oldStatus !== newStatus) {
      log(`🔄 Status da NF mudou: ${oldStatus} → ${newStatus} (NF: ${payload.new.numero_nf})`);
    }
  }
}

function handleDocumentoChange(payload: any, queryClient: QueryClient) {
  // 🎯 Invalidação por PREDICATE - cobre TODAS as variações de chave financeiro
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [firstKey] = query.queryKey;
      return firstKey === 'documentos_financeiros' || firstKey === 'financeiro';
    }
  });
  
  // Dashboard sempre
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  log('💰 Documento financeiro atualizado em tempo real');
}

function handleEventLogChange(payload: any, queryClient: QueryClient) {
  // 🎯 Invalidação por PREDICATE - cobre logs e eventos
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [firstKey, secondKey] = query.queryKey;
      return (firstKey === 'realtime' && secondKey === 'events') ||
             firstKey === 'event-logs' || 
             firstKey === 'system-logs';
    }
  });
  
  // Dashboard sempre
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  
  log('📝 Novo evento registrado no log');
}

// Hook para usar em componentes React
export function useCentralizedRealtime(queryClient: QueryClient) {
  log('🔗 Configurando realtime centralizada no componente');
  
  const cleanup = subscribeCentralizedChanges(queryClient);
  
  // Cleanup automático quando o componente desmontar
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    };
  }
  
  return cleanup;
}