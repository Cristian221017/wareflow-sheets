import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type VisitKey = 'nfs-confirmadas' | 'pedidos-liberados' | 'solicitacoes-pendentes' | 'nfs-armazenadas' | 'documentos-financeiros';

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
  
  return {
    getLastVisit,
    markAsVisited,
    hasNewItems,
    clearNotification
  };
}