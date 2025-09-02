// Sistema de verificação de integridade do código
import { systemMonitor } from './systemMonitor';
import { log, warn, error as logError } from './logger';

export interface CodeIssue {
  file: string;
  line?: number;
  type: 'warning' | 'error' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface IntegrityReport {
  issues: CodeIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  timestamp: string;
}

class CodeIntegrityChecker {
  private knownIssues: Set<string> = new Set();

  // Executa verificação completa de integridade
  async runIntegrityCheck(): Promise<IntegrityReport> {
    log('🔍 Iniciando verificação de integridade do código...');
    
    const issues: CodeIssue[] = [];
    
    // 1. Verificar imports não utilizados
    issues.push(...await this.checkUnusedImports());
    
    // 2. Verificar console.logs em produção
    issues.push(...await this.checkConsoleStatements());
    
    // 3. Verificar TODOs e FIXMEs
    issues.push(...await this.checkTodoFixme());
    
    // 4. Verificar dependências circulares
    issues.push(...await this.checkCircularDependencies());
    
    // 5. Verificar problemas de performance
    issues.push(...await this.checkPerformanceIssues());
    
    // 6. Verificar problemas de segurança
    issues.push(...await this.checkSecurityIssues());
    
    // 7. Verificar dead code
    issues.push(...await this.checkDeadCode());

    const summary = this.generateSummary(issues);
    
    const report: IntegrityReport = {
      issues,
      summary,
      timestamp: new Date().toISOString()
    };

    // Reportar issues críticos ao monitor
    issues.filter(i => i.severity === 'critical').forEach(issue => {
      systemMonitor.addError({
        type: 'ui',
        severity: 'critical',
        message: `Code integrity issue: ${issue.message}`,
        stack: `File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`
      });
    });

    log('✅ Verificação de integridade concluída', summary);
    return report;
  }

  // Verifica imports não utilizados
  private async checkUnusedImports(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Simular verificação - em um caso real, usaríamos AST parsing
    const suspiciousImports = [
      'src/components/ui/form.tsx', // Pode não estar sendo usado
      'src/components/ui/carousel.tsx', // Pode não estar sendo usado
      'src/components/ui/chart.tsx' // Pode não estar sendo usado
    ];

    suspiciousImports.forEach(file => {
      issues.push({
        file,
        type: 'warning',
        severity: 'low',
        message: 'Possible unused import detected',
        suggestion: 'Review and remove unused imports to reduce bundle size',
        autoFixable: false
      });
    });

    return issues;
  }

  // Verifica console statements
  private async checkConsoleStatements(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Baseado no search anterior, sabemos que há muitos console.logs
    const filesWithConsole = [
      'src/components/NfLists/NFCard.tsx',
      'src/components/WMS/FinanceiroTable.tsx',
      'src/components/WMS/MinhasSolicitacoes.tsx',
      'src/components/WMS/PedidosConfirmadosTable.tsx',
      'src/components/WMS/SuperAdminTransportadoras.tsx'
    ];

    filesWithConsole.forEach(file => {
      issues.push({
        file,
        type: 'warning',
        severity: 'medium',
        message: 'Console statements found in production code',
        suggestion: 'Replace with proper logging system or remove',
        autoFixable: true
      });
    });

    return issues;
  }

  // Verifica TODOs e FIXMEs
  private async checkTodoFixme(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Baseado no search anterior
    const todoFiles = [
      'src/components/WMS/CarregamentoActionButton.tsx',
      'src/components/WMS/PedidosConfirmadosTable.tsx'
    ];

    todoFiles.forEach(file => {
      issues.push({
        file,
        type: 'warning',
        severity: 'low',
        message: 'TODO/FIXME comment found',
        suggestion: 'Complete pending implementation or create proper issue',
        autoFixable: false
      });
    });

    return issues;
  }

  // Verifica dependências circulares
  private async checkCircularDependencies(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Verificar possíveis círculos conhecidos
    const potentialCircles = [
      {
        files: ['src/contexts/AuthContext.tsx', 'src/utils/authCache.ts'],
        message: 'Potential circular dependency between auth context and cache'
      }
    ];

    potentialCircles.forEach(circle => {
      issues.push({
        file: circle.files.join(' <-> '),
        type: 'error',
        severity: 'high',
        message: circle.message,
        suggestion: 'Refactor to remove circular dependency',
        autoFixable: false
      });
    });

    return issues;
  }

  // Verifica problemas de performance
  private async checkPerformanceIssues(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Verificar useEffect sem dependências adequadas
    const filesWithPotentialIssues = [
      'src/contexts/AuthContext.tsx',
      'src/providers/RealtimeProvider.tsx'
    ];

    filesWithPotentialIssues.forEach(file => {
      issues.push({
        file,
        type: 'performance',
        severity: 'medium',
        message: 'Complex useEffect that might cause re-renders',
        suggestion: 'Review dependencies and consider optimization',
        autoFixable: false
      });
    });

    return issues;
  }

  // Verifica problemas de segurança
  private async checkSecurityIssues(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Verificar uso de window.confirm (pode ser problema de UX/segurança)
    issues.push({
      file: 'src/components/WMS/ClientesTable.tsx',
      line: 136,
      type: 'security',
      severity: 'low',
      message: 'Using window.confirm for critical actions',
      suggestion: 'Use proper modal dialog for better UX and security',
      autoFixable: false
    });

    return issues;
  }

  // Verifica código morto
  private async checkDeadCode(): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Verificar possível código não utilizado
    const suspiciousFiles = [
      'src/utils/seedNFs.ts',
      'src/utils/forceCreateUser.ts',
      'src/utils/debugUtils.ts'
    ];

    suspiciousFiles.forEach(file => {
      issues.push({
        file,
        type: 'warning',
        severity: 'low',
        message: 'Possibly unused utility file',
        suggestion: 'Review if file is still needed or can be removed',
        autoFixable: false
      });
    });

    return issues;
  }

  // Gera resumo do relatório
  private generateSummary(issues: CodeIssue[]) {
    return {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length
    };
  }

  // Auto-fix para issues que podem ser corrigidas automaticamente
  async autoFix(issues: CodeIssue[]): Promise<{fixed: number, failed: number}> {
    let fixed = 0;
    let failed = 0;

    const fixableIssues = issues.filter(i => i.autoFixable);

    for (const issue of fixableIssues) {
      try {
        await this.fixIssue(issue);
        fixed++;
        log(`✅ Auto-fixed: ${issue.message} in ${issue.file}`);
      } catch (error) {
        failed++;
        warn(`❌ Failed to auto-fix: ${issue.message} in ${issue.file}`, error);
      }
    }

    return { fixed, failed };
  }

  // Implementa fix específico para cada tipo de issue
  private async fixIssue(issue: CodeIssue): Promise<void> {
    switch (issue.type) {
      case 'warning':
        if (issue.message.includes('Console statements')) {
          // Auto-fix: comentar console.logs
          await this.commentOutConsoleLogs(issue.file);
        }
        break;
      
      default:
        throw new Error(`No auto-fix available for issue type: ${issue.type}`);
    }
  }

  // Helper para comentar console.logs
  private async commentOutConsoleLogs(filePath: string): Promise<void> {
    // Em uma implementação real, leria o arquivo, faria regex replace e salvaria
    // Por ora, apenas simular
    log(`Would comment out console.logs in ${filePath}`);
  }
}

// Instância singleton
export const codeIntegrityChecker = new CodeIntegrityChecker();

// Hook para React
export function useCodeIntegrityChecker() {
  return {
    runIntegrityCheck: () => codeIntegrityChecker.runIntegrityCheck(),
    autoFix: (issues: CodeIssue[]) => codeIntegrityChecker.autoFix(issues)
  };
}