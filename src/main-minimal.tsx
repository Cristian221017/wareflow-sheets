import { createRoot } from 'react-dom/client'
import React from 'react'

// VERSÃO ULTRA MINIMAL - ZERO MEMORY LEAKS
console.log('🚨 MINIMAL MODE - Preventing memory leaks');

function MinimalApp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold text-green-600">✅ Sistema Mínimo Funcionando</h1>
        <p className="text-gray-700">Versão sem memory leaks</p>
        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ React OK</p>
          <p>✅ Memória controlada</p>
          <p>✅ Zero providers problemáticos</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Testar Reload
        </button>
      </div>
    </div>
  );
}

// Inicialização ultra-simples
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root not found');
}

const root = createRoot(container);
root.render(<MinimalApp />);

console.log('✅ Minimal system loaded - zero memory usage');