import { createRoot } from 'react-dom/client'
import { TooltipProvider } from "@/components/ui/tooltip";
import React from 'react'

// TESTE PASSO 1: Só TooltipProvider
console.log('🧪 STEP 1 - Testing TooltipProvider only');

function TestApp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600">🧪 Step 1: TooltipProvider</h1>
        <p className="text-gray-700">Se você vê isso, TooltipProvider está OK</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Próximo: AuthProvider</p>
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

console.log('🚀 Rendering with TooltipProvider...');
root.render(
  <TooltipProvider>
    <TestApp />
  </TooltipProvider>
);

console.log('✅ Step 1 complete - TooltipProvider test');