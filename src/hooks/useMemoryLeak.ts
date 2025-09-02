import { useEffect, useRef } from 'react';
import { log, warn } from '@/utils/logger';

/**
 * Hook para detectar e prevenir vazamentos de memória
 */
export function useMemoryLeakDetection(componentName: string) {
  const mountTime = useRef(Date.now());
  const subscriptions = useRef<(() => void)[]>([]);
  const timers = useRef<(NodeJS.Timeout | number)[]>([]);

  // Registrar subscription para cleanup automático
  const addSubscription = (unsubscribe: () => void) => {
    subscriptions.current.push(unsubscribe);
  };

  // Registrar timer para cleanup automático
  const addTimer = (timer: NodeJS.Timeout | number) => {
    timers.current.push(timer);
  };

  // Cleanup automático na desmontagem
  useEffect(() => {
    log(`🔍 ${componentName} montado em ${new Date(mountTime.current).toISOString()}`);
    
    return () => {
      const unmountTime = Date.now();
      const lifespan = unmountTime - mountTime.current;
      
      // Limpar todas as subscriptions registradas
      subscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          warn(`Erro ao limpar subscription em ${componentName}:`, error);
        }
      });

      // Limpar todos os timers registrados
      timers.current.forEach(timer => {
        clearTimeout(timer as number);
        clearInterval(timer as number);
      });

      // Log de desmontagem para debugging
      log(`🧹 ${componentName} desmontado após ${lifespan}ms`);
      
      // Avisar sobre componentes que ficaram montados por muito tempo
      if (lifespan > 300000) { // 5 minutos
        warn(`⚠️ ${componentName} ficou montado por ${Math.round(lifespan / 60000)} minutos - possível vazamento?`);
      }
    };
  }, [componentName]);

  return {
    addSubscription,
    addTimer,
    getLifespan: () => Date.now() - mountTime.current
  };
}

/**
 * Hook para monitorar performance de re-renders
 */
export function useRenderPerformance(componentName: string, deps?: any[]) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const prevDeps = useRef(deps);

  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Log re-renders muito frequentes
    if (timeSinceLastRender < 100 && renderCount.current > 1) {
      warn(`🔄 ${componentName} re-renderizando muito frequentemente (${timeSinceLastRender}ms entre renders)`);
    }

    // Log dependências que mudaram
    if (deps && prevDeps.current) {
      const changedDeps = deps.filter((dep, index) => dep !== prevDeps.current?.[index]);
      if (changedDeps.length > 0) {
        log(`🔄 ${componentName} re-render #${renderCount.current} - deps alteradas:`, changedDeps);
      }
    }

    lastRenderTime.current = now;
    prevDeps.current = deps;
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  };
}