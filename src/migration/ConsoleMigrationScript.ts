// Script automático para substituir console.logs por productionLogger
import { log, warn, error } from '@/utils/productionLogger';

/**
 * SUBSTITUIÇÕES AUTOMÁTICAS NECESSÁRIAS:
 * 
 * ❌ ANTES: console.log('mensagem', data)
 * ✅ DEPOIS: log('mensagem', data)
 * 
 * ❌ ANTES: console.warn('aviso', data)  
 * ✅ DEPOIS: warn('aviso', data)
 * 
 * ❌ ANTES: console.error('erro', data)
 * ✅ DEPOIS: error('erro', data)
 */

// IMPACTOS DA MIGRAÇÃO:

export const CONSOLE_MIGRATION_IMPACTS = {
  PRODUCTION: {
    description: 'Em PRODUÇÃO, console.logs são detectados e alertados',
    impact: 'CRÍTICO - Exposição de dados sensíveis',
    action: 'SUBSTITUIR IMEDIATAMENTE'
  },
  
  DEVELOPMENT: {
    description: 'Em DESENVOLVIMENTO, console.logs continuam funcionando mas são monitorados',
    impact: 'MÉDIO - Poluição do console',
    action: 'MIGRAR GRADUALMENTE'
  },
  
  PERFORMANCE: {
    description: 'productionLogger é otimizado e não impacta performance',
    impact: 'POSITIVO - Melhor performance',
    action: 'BENEFÍCIO DA MIGRAÇÃO'
  },

  DEBUGGING: {
    description: 'productionLogger oferece mais funcionalidades (grupos, timing, etc)',
    impact: 'POSITIVO - Melhor debugging',
    action: 'FUNCIONALIDADE EXTRA'
  }
};

// ARQUIVOS QUE PRECISAM SER MIGRADOS (364 ocorrências):

export const FILES_TO_MIGRATE = [
  'src/components/NfLists/NFCard.tsx',           // 6 console.logs
  'src/components/WMS/MinhasSolicitacoes.tsx',   // 5 console.logs
  'src/components/WMS/SolicitacoesPendentesTable.tsx', // 1 console.log
  'src/components/WMS/SuperAdminTransportadoras.tsx',  // 7 console.errors
  'src/components/WMS/SuperAdminUsuarios.tsx',         // 11 console.errors
  'src/config/env.ts',                          // 2 console.errors
  'src/hooks/useDashboard.ts',                  // 4 console.logs
  'src/hooks/useDeploymentSafety.ts',           // 12 console.logs
  'src/hooks/useEventLog.ts',                   // 2 console.errors
  'src/hooks/useFeatureFlags.ts',               // 2 console.errors
  'src/hooks/useSolicitacoes.ts',               // 6 console.logs
  'src/lib/realtimeNfs.ts',                     // E muitos mais...
  // ... total 364 ocorrências em 34 arquivos
];

// ESTRATÉGIA DE MIGRAÇÃO:

export const MIGRATION_STRATEGY = {
  PHASE_1: {
    title: 'Arquivos Críticos (Produção)',
    files: [
      'src/config/env.ts',                    // ENV errors
      'src/contexts/AuthContext.tsx',         // Auth logs  
      'src/contexts/WMSContext.tsx',          // WMS logs
      'src/contexts/FinanceiroContext.tsx'    // Finance logs
    ],
    priority: 'CRÍTICA',
    impact: 'Elimina exposição de dados sensíveis'
  },

  PHASE_2: {
    title: 'Componentes de UI',
    files: [
      'src/components/WMS/*.tsx',
      'src/components/NfLists/*.tsx'
    ],
    priority: 'ALTA',
    impact: 'Melhora debugging e remove poluição console'
  },

  PHASE_3: {
    title: 'Hooks e Utilitários',
    files: [
      'src/hooks/*.ts',
      'src/lib/*.ts',
      'src/utils/*.ts'
    ],
    priority: 'MÉDIA',
    impact: 'Finaliza padronização completa'
  }
};

// EXEMPLO DE MIGRAÇÃO AUTOMÁTICA:

export function migrateConsoleStatements(fileContent: string): string {
  return fileContent
    // console.log → log
    .replace(/console\.log\(/g, 'log(')
    // console.warn → warn  
    .replace(/console\.warn\(/g, 'warn(')
    // console.error → error
    .replace(/console\.error\(/g, 'error(')
    // Adicionar import se não existir
    .replace(
      /^(import.*from.*['"].*['"];?)$/m,
      (match) => {
        if (match.includes('@/utils/productionLogger')) return match;
        return `${match}\nimport { log, warn, error } from '@/utils/productionLogger';`;
      }
    );
}

export default CONSOLE_MIGRATION_IMPACTS;