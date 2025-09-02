import { createRoot } from 'react-dom/client'
import { TooltipProvider } from "@/components/ui/tooltip";
import { SimplifiedAuthProvider } from '@/contexts/SimplifiedAuthContext';
import React from 'react'

// TESTE PASSO 2: TooltipProvider + AuthProvider
console.log('🧪 STEP 2 - Testing AuthProvider');

function TestApp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-orange-600">🧪 Step 2: AuthProvider</h1>
        <p className="text-gray-700">Se você vê isso, AuthProvider está OK</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Próximo: BrowserRouter</p>
        </div>
      </div>
    </div>
  );
}

console.log('🔍 Finding root element...');
const container = document.getElementById('root');
if (!container) {
  console.error('❌ CRITICAL: Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root found, creating React root...');
const root = createRoot(container);

console.log('🚀 Rendering with AuthProvider...');
root.render(
  <TooltipProvider>
    <SimplifiedAuthProvider>
      <TestApp />
    </SimplifiedAuthProvider>
  </TooltipProvider>
);

console.log('✅ Step 2 complete - AuthProvider test');