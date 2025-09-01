import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Arrays e objetos vazios reutilizáveis para evitar re-renders
export const EMPTY_ARRAY: any[] = [];
export const EMPTY_OBJECT = {};

// Hook para inicialização otimizada de estado
export function useOptimizedState<T>(initialValue: T | (() => T)) {
  return useMemo(() => {
    return typeof initialValue === 'function' 
      ? (initialValue as () => T)() 
      : initialValue;
  }, []);
}

// Hook para handlers otimizados com dependências
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useCallback(callback, deps);
}

// Hook para arrays de seleção otimizados
export function useSelection<T>(initialSelected: T[] = EMPTY_ARRAY) {
  const [selected, setSelected] = useState<T[]>(initialSelected);

  const toggleSelect = useCallback((item: T) => {
    setSelected(prev => 
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelected(items);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(EMPTY_ARRAY);
  }, []);

  const isSelected = useCallback((item: T) => {
    return selected.includes(item);
  }, [selected]);

  return {
    selected,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selected.length,
    hasSelection: selected.length > 0
  };
}

// Hook para debounce otimizado
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para memoização de computações custosas
export function useComputedValue<T>(
  computeFn: () => T,
  deps: any[]
): T {
  return useMemo(computeFn, deps);
}

// Helper para preventDefault otimizado
export const preventDefault = (fn?: () => void) => (e: React.FormEvent) => {
  e.preventDefault();
  fn?.();
};

// Helper para stopPropagation otimizado  
export const stopPropagation = (fn?: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn?.();
};