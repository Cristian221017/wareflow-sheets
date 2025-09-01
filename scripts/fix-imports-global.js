#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getAllTSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      getAllTSFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let hasChanges = false;

  // Fix AuthContext imports
  const authImportPattern = /import\s+\{([^}]+)\}\s+from\s+['"]@\/contexts\/AuthContext['"]/g;
  modified = modified.replace(authImportPattern, (match, imports) => {
    hasChanges = true;
    return `import {${imports}} from '@/contexts/SimplifiedAuthContext'`;
  });

  // Fix logger imports - unify all to optimizedLogger
  const loggerPatterns = [
    /import\s+\{([^}]+)\}\s+from\s+['"]@\/utils\/logger['"]/g,
    /import\s+\{([^}]+)\}\s+from\s+['"]@\/utils\/productionLogger['"]/g
  ];

  loggerPatterns.forEach(pattern => {
    modified = modified.replace(pattern, (match, imports) => {
      hasChanges = true;
      return `import {${imports}} from '@/utils/optimizedLogger'`;
    });
  });

  // Write back if changed
  if (hasChanges) {
    fs.writeFileSync(filePath, modified);
    console.log(`✅ Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// Main execution
const srcDir = path.join(process.cwd(), 'src');
const allFiles = getAllTSFiles(srcDir);
let fixedCount = 0;

console.log('🔧 Fixing imports globally...');

for (const file of allFiles) {
  if (fixImports(file)) {
    fixedCount++;
  }
}

console.log(`\n✨ Fixed imports in ${fixedCount} files out of ${allFiles.length} total files.`);