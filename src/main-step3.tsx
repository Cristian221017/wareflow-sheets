import { createRoot } from 'react-dom/client'
import { TooltipProvider } from "@/components/ui/tooltip";
import { SimplifiedAuthProvider } from '@/contexts/SimplifiedAuthContext';  
import { BrowserRouter } from "react-router-dom";
import React from 'react'

// TESTE PASSO 3: TooltipProvider + AuthProvider + BrowserRouter
console.log('🧪 STEP 3 - Testing BrowserRouter');

function TestApp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-purple-600">🧪 Step 3: BrowserRouter</h1>
        <p className="text-gray-700">Se você vê isso, BrowserRouter está OK</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Próximo: WMSProvider</p>
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

console.log('🚀 Rendering with BrowserRouter...');
root.render(
  <TooltipProvider>
    <SimplifiedAuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <TestApp />
      </BrowserRouter>
    </SimplifiedAuthProvider>
  </TooltipProvider>
);

console.log('✅ Step 3 complete - BrowserRouter test');