#!/usr/bin/env node

/**
 * Script para verificar integridade do código antes do build
 * Detecta "..." literais problemáticos em arquivos TS/TSX
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verificando integridade do código...');

try {
  // Usar ripgrep se disponível, senão grep
  let searchCommand;
  try {
    execSync('which rg', { stdio: 'ignore' });
    searchCommand = 'rg -n "\\.\\.\\." src --glob "**/*.{ts,tsx}" --type-not=test';
  } catch {
    searchCommand = 'grep -Rn "\\.\\.\\." src --include="*.ts" --include="*.tsx"';
  }

  const result = execSync(searchCommand, { encoding: 'utf8', stdio: 'pipe' });
  
  if (result.trim()) {
    const lines = result.trim().split('\n');
    
    // Filtrar apenas casos problemáticos (não spread operators ou strings)
    const problematicLines = lines.filter(line => {
      // Ignorar casos válidos
      const validPatterns = [
        /\.\.\.[a-zA-Z_$]/,          // spread operator: ...prev
        /['"`].*\.\.\..*['"`]/,      // strings: "Carregando..."
        /\[\.\.\..*\]/,             // array spread: [...items]
        /\{\.\.\..*\}/,             // object spread: {...props}
        /\(\.\.\..*\)/,             // function params: (...args)
      ];
      
      return !validPatterns.some(pattern => pattern.test(line));
    });
    
    if (problematicLines.length > 0) {
      console.error('❌ Código truncado detectado (…/...) em TS/TSX:');
      problematicLines.forEach(line => console.error(`  ${line}`));
      console.error('\n💡 Corrija o código truncado antes do build.');
      process.exit(1);
    }
  }
  
  console.log('✅ Integridade do código verificada - nenhum problema encontrado');
} catch (error) {
  if (error.status === 1) {
    // Código 1 do grep/rg significa "nenhuma correspondência encontrada" - isso é bom
    console.log('✅ Integridade do código verificada - nenhum problema encontrado');
  } else {
    console.error('❌ Erro ao verificar integridade do código:', error.message);
    process.exit(1);
  }
}