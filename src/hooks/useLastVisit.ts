import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type VisitKey = 'nfs-confirmadas' | 'pedidos-liberados' | 'solicitacoes-pendentes' | 'nfs-armazenadas' | 'documentos_financeiros';

export function useLastVisit() {
  const { user } = useAuth();
  
  const getStorageKey = (key: VisitKey) => `lastVisit_${user?.id}_${key}`;
  
  const getLastVisit = useCallback((key: VisitKey): Date | null => {
    if (!user) return null;
    
    const stored = localStorage.getItem(getStorageKey(key));
    return stored ? new Date(stored) : null;
  }, [user]);
  
  const markAsVisited = useCallback((key: VisitKey) => {
    if (!user) return;
    
    const now = new Date().toISOString();
    localStorage.setItem(getStorageKey(key), now);
    
    // Force immediate re-render by triggering a state update
    window.dispatchEvent(new CustomEvent('notificationCleared', { detail: { key } }));
  }, [user]);
  
  const hasNewItems = useCallback((key: VisitKey, items: any[]): boolean => {
    if (!user || !items?.length) return false;
    
    const lastVisit = getLastVisit(key);
    if (!lastVisit) return items.length > 0;
    
    // Verifica se há itens criados/atualizados após a última visita
    return items.some(item => {
      const itemDate = new Date(item.updated_at || item.created_at);
      return itemDate > lastVisit;
    });
  }, [user, getLastVisit]);

  const clearNotification = useCallback((key: VisitKey) => {
    markAsVisited(key);
    // Force re-evaluation by returning current timestamp
    return new Date().getTime();
  }, [markAsVisited]);

  // Auto-clear notifications when component is viewed
  const markVisitForComponent = useCallback((key: VisitKey) => {
    // Mark as visited immediately for instant notification clearing
    setTimeout(() => markAsVisited(key), 100);
  }, [markAsVisited]);
  
  return {
    getLastVisit,
    markAsVisited,
    hasNewItems,
    markVisitForComponent,
    clearNotification
  };
}