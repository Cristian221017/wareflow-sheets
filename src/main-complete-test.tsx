import { createRoot } from 'react-dom/client'
import React, { useState, useEffect } from 'react'

// TESTE COMPLETO - Todos os providers de uma só vez
console.log('🧪 COMPLETE TEST - Testing all providers step by step');

function ProviderTest({ name, children, onResult }: { 
  name: string, 
  children: React.ReactNode, 
  onResult: (name: string, success: boolean, error?: string) => void 
}) {
  useEffect(() => {
    try {
      console.log(`✅ ${name} - OK`);
      onResult(name, true);
    } catch (error) {
      console.error(`❌ ${name} - FAILED:`, error);
      onResult(name, false, String(error));
    }
  }, [name, onResult]);

  return <>{children}</>;
}

function CompleteTestApp() {
  const [results, setResults] = useState<Record<string, { success: boolean, error?: string }>>({});
  
  const handleResult = (name: string, success: boolean, error?: string) => {
    setResults(prev => ({ ...prev, [name]: { success, error } }));
  };

  // Test each provider progressively
  const TestTooltipProvider = () => {
    try {
      const { TooltipProvider } = require("@/components/ui/tooltip");
      return (
        <ProviderTest name="TooltipProvider" onResult={handleResult}>
          <TooltipProvider>
            <TestAuthProvider />
          </TooltipProvider>
        </ProviderTest>
      );
    } catch (error) {
      console.error('❌ TooltipProvider failed:', error);
      handleResult('TooltipProvider', false, String(error));
      return <div>❌ TooltipProvider failed</div>;
    }
  };

  const TestAuthProvider = () => {
    try {
      const { SimplifiedAuthProvider } = require('@/contexts/SimplifiedAuthContext');
      return (
        <ProviderTest name="SimplifiedAuthProvider" onResult={handleResult}>
          <SimplifiedAuthProvider>
            <TestBrowserRouter />
          </SimplifiedAuthProvider>
        </ProviderTest>
      );
    } catch (error) {
      console.error('❌ SimplifiedAuthProvider failed:', error);
      handleResult('SimplifiedAuthProvider', false, String(error));
      return <div>❌ SimplifiedAuthProvider failed</div>;
    }
  };

  const TestBrowserRouter = () => {
    try {
      const { BrowserRouter } = require("react-router-dom");
      return (
        <ProviderTest name="BrowserRouter" onResult={handleResult}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <TestWMSProvider />
          </BrowserRouter>
        </ProviderTest>
      );
    } catch (error) {
      console.error('❌ BrowserRouter failed:', error);
      handleResult('BrowserRouter', false, String(error));
      return <div>❌ BrowserRouter failed</div>;
    }
  };

  const TestWMSProvider = () => {
    try {
      const { WMSProvider } = require("@/contexts/WMSContext");
      return (
        <ProviderTest name="WMSProvider" onResult={handleResult}>
          <WMSProvider>
            <TestFinanceiroProvider />
          </WMSProvider>
        </ProviderTest>
      );
    } catch (error) {
      console.error('❌ WMSProvider failed:', error);
      handleResult('WMSProvider', false, String(error));
      return <div>❌ WMSProvider failed</div>;
    }
  };

  const TestFinanceiroProvider = () => {
    try {
      const { FinanceiroProvider } = require("@/contexts/FinanceiroContext");
      return (
        <ProviderTest name="FinanceiroProvider" onResult={handleResult}>
          <FinanceiroProvider>
            <TestOptimizedRealtimeProvider />
          </FinanceiroProvider>
        </ProviderTest>
      );
    } catch (error) {
      console.error('❌ FinanceiroProvider failed:', error);
      handleResult('FinanceiroProvider', false, String(error));
      return <div>❌ FinanceiroProvider failed</div>;
    }
  };

  const TestOptimizedRealtimeProvider = () => {
    try {
      const OptimizedRealtimeProvider = require("@/providers/OptimizedRealtimeProvider").default;
      return (
        <ProviderTest name="OptimizedRealtimeProvider" onResult={handleResult}>
          <OptimizedRealtimeProvider>
            <FinalResults />
          </OptimizedRealtimeProvider>
        </ProviderTest>
      );
    } catch (error) {
      console.error('❌ OptimizedRealtimeProvider failed:', error);
      handleResult('OptimizedRealtimeProvider', false, String(error));
      return <div>❌ OptimizedRealtimeProvider failed</div>;
    }
  };

  const FinalResults = () => {
    handleResult('Complete', true);
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">🧪 Provider Testing Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(results).map(([name, result]) => (
            <div 
              key={name}
              className={`p-4 rounded-lg border-2 ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{result.success ? '✅' : '❌'}</span>
                <span className="font-semibold">{name}</span>
              </div>
              {result.error && (
                <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
                  {result.error}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">🔄 Testing in Progress...</h2>
          <p className="text-gray-600">
            Providers are being tested sequentially. Check the results above.
          </p>
        </div>
      </div>

      {/* Hidden test execution */}
      <div style={{ display: 'none' }}>
        <TestTooltipProvider />
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

console.log('🚀 Starting complete provider test...');
root.render(<CompleteTestApp />);
console.log('✅ Complete test initialized');