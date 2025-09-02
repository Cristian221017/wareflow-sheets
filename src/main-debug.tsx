import { createRoot } from 'react-dom/client'
import React from 'react'

// VERSÃO DE DEBUG ULTRA SIMPLES - SEM PROVIDERS COMPLEXOS
console.log('🔧 DEBUG MODE - Starting minimal initialization');

function SimpleApp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-green-600">✅ Sistema Funcional!</h1>
        <p className="text-gray-700">React está funcionando perfeitamente</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Próximo passo: Adicionar providers um por um</p>
        </div>
      </div>
    </div>
  );
}

// Simple initialization
console.log('🔍 Finding root element...');
const container = document.getElementById('root');
if (!container) {
  console.error('❌ CRITICAL: Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root found, creating React root...');
const root = createRoot(container);

console.log('🚀 Rendering simple app...');
root.render(<SimpleApp />);

console.log('✅ Simple app rendered - React is working!');
console.log('📊 Next step: Test individual providers');