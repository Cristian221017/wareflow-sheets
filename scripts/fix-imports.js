// Script para corrigir todas as importações quebradas após refatoração
const fs = require('fs');
const path = require('path');

// Mapeamento de substituições
const replacements = [
  // Auth imports
  {
    find: /import { useAuth } from '@\/contexts\/AuthContext';/g,
    replace: "import { useAuth } from '@/contexts/SimplifiedAuthContext';"
  },
  {
    find: /import { useAuth } from '\.\/AuthContext';/g,
    replace: "import { useAuth } from '@/contexts/SimplifiedAuthContext';"
  },
  
  // Logger imports
  {
    find: /import { log } from '@\/utils\/logger';/g,
    replace: "import { log } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { warn } from '@\/utils\/logger';/g,
    replace: "import { warn } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { error } from '@\/utils\/logger';/g,
    replace: "import { error } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { log, warn, error } from '@\/utils\/logger';/g,
    replace: "import { log, warn, error } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { log, warn, error as logError, audit, auditError } from '@\/utils\/logger';/g,
    replace: "import { log, warn, error as logError, audit, auditError } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { log, error as logError } from '@\/utils\/productionLogger';/g,
    replace: "import { log, error as logError } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { log, warn, error as logError } from '@\/utils\/productionLogger';/g,
    replace: "import { log, warn, error as logError } from '@/utils/optimizedLogger';"
  },
  {
    find: /import { error as logError } from '@\/utils\/productionLogger';/g,
    replace: "import { error as logError } from '@/utils/optimizedLogger';"
  }
];

// Função para corrigir arquivo
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ find, replace }) => {
      if (find.test(content)) {
        content = content.replace(find, replace);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Função para percorrer diretório recursivamente
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    
    if (stats.isDirectory()) {
      walkDir(filepath, callback);
    } else if (file.match(/\.(ts|tsx)$/)) {
      callback(filepath);
    }
  });
}

// Executar correções
console.log('🔧 Iniciando correção de importações...');

let fixedCount = 0;
walkDir('./src', (filePath) => {
  if (fixFile(filePath)) {
    fixedCount++;
  }
});

console.log(`🎉 Correção concluída! ${fixedCount} arquivos corrigidos.`);