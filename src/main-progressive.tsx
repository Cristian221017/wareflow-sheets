import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState, useEffect } from 'react'
import { memoryManager } from '@/utils/memoryManager'

// VERSÃO PROGRESSIVA - Testa cada provider individualmente
console.log('🔄 PROGRESSIVE LOADING - Testing each provider step by step');

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  memoryBefore?: string;
  memoryAfter?: string;
  errorMessage?: string;
}

function ProgressiveApp() {
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    { name: 'QueryClient Only', component: QueryClientTest },
    { name: 'AuthProvider', component: AuthTest },  
    { name: 'WMSProvider', component: WMSTest },
    { name: 'FinanceiroProvider', component: FinanceiroTest },
    { name: 'RealtimeProvider', component: RealtimeTest },
    { name: 'Complete App', component: CompleteTest }
  ];

  const getMemoryUsage = () => {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      return `${Math.round(memory.usedJSHeapSize / 1048576)}MB`;
    }
    return 'N/A';
  };

  const runTest = async (stepIndex: number) => {
    const step = steps[stepIndex];
    const memoryBefore = getMemoryUsage();
    
    setResults(prev => [...prev, {
      step: step.name,
      status: 'pending',
      memoryBefore
    }]);

    try {
      // Force cleanup before test
      memoryManager.cleanupAll();
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const memoryAfter = getMemoryUsage();
      
      setResults(prev => prev.map((result, index) => 
        index === prev.length - 1 
          ? { ...result, status: 'success', memoryAfter }
          : result
      ));
      
      console.log(`✅ Step ${stepIndex + 1}: ${step.name} - Memory: ${memoryBefore} → ${memoryAfter}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResults(prev => prev.map((result, index) => 
        index === prev.length - 1 
          ? { ...result, status: 'error', errorMessage }
          : result
      ));
      
      console.error(`❌ Step ${stepIndex + 1}: ${step.name} failed:`, error);
    }
  };

  const startTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      await runTest(i);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
    }
    
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-start with first step
    if (currentStep === 0 && results.length === 0) {
      startTests();
    }
  }, []);

  const CurrentComponent = steps[currentStep]?.component || (() => <div>Invalid Step</div>);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">🔄 Progressive Loading Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Control Panel</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Current Step: {currentStep + 1} / {steps.length}
                  </label>
                  <div className="text-lg font-semibold text-blue-600">
                    {steps[currentStep]?.name}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0 || isRunning}
                    className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                    disabled={currentStep === steps.length - 1 || isRunning}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                  
                  <button
                    onClick={startTests}
                    disabled={isRunning}
                    className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
                  >
                    {isRunning ? 'Testing...' : 'Run Tests'}
                  </button>
                </div>
                
                <div className="text-sm text-gray-600">
                  Current Memory: {getMemoryUsage()}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Test Results</h2>
              
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      result.status === 'success' 
                        ? 'bg-green-50 border-green-400'
                        : result.status === 'error'
                        ? 'bg-red-50 border-red-400' 
                        : 'bg-yellow-50 border-yellow-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.step}</span>
                      <span className="text-sm">
                        {result.status === 'success' && '✅'}
                        {result.status === 'error' && '❌'}
                        {result.status === 'pending' && '🔄'}
                      </span>
                    </div>
                    
                    {result.memoryBefore && (
                      <div className="text-sm text-gray-600">
                        Memory: {result.memoryBefore} → {result.memoryAfter || '...'}
                      </div>
                    )}
                    
                    {result.errorMessage && (
                      <div className="text-sm text-red-600 mt-1">
                        {result.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Current Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Current Test</h2>
            <div className="border rounded p-4">
              <CurrentComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Test Components
function QueryClientTest() {
  return <div className="text-green-600">✅ QueryClient Only - Basic React working</div>;
}

function AuthTest() {
  try {
    const { SimplifiedAuthProvider } = require('@/contexts/SimplifiedAuthContext');
    return (
      <SimplifiedAuthProvider>
        <div className="text-green-600">✅ AuthProvider loaded successfully</div>
      </SimplifiedAuthProvider>
    );
  } catch (error) {
    return <div className="text-red-600">❌ AuthProvider failed: {String(error)}</div>;
  }
}

function WMSTest() {
  try {
    const { SimplifiedAuthProvider } = require('@/contexts/SimplifiedAuthContext');
    const { WMSProvider } = require('@/contexts/WMSContext');
    return (
      <SimplifiedAuthProvider>
        <WMSProvider>
          <div className="text-green-600">✅ WMSProvider loaded successfully</div>
        </WMSProvider>
      </SimplifiedAuthProvider>
    );
  } catch (error) {
    return <div className="text-red-600">❌ WMSProvider failed: {String(error)}</div>;
  }
}

function FinanceiroTest() {
  try {
    const { SimplifiedAuthProvider } = require('@/contexts/SimplifiedAuthContext');
    const { WMSProvider } = require('@/contexts/WMSContext');
    const { FinanceiroProvider } = require('@/contexts/FinanceiroContext');
    return (
      <SimplifiedAuthProvider>
        <WMSProvider>
          <FinanceiroProvider>
            <div className="text-green-600">✅ FinanceiroProvider loaded successfully</div>
          </FinanceiroProvider>
        </WMSProvider>
      </SimplifiedAuthProvider>
    );
  } catch (error) {
    return <div className="text-red-600">❌ FinanceiroProvider failed: {String(error)}</div>;
  }
}

function RealtimeTest() {
  try {
    const { SimplifiedAuthProvider } = require('@/contexts/SimplifiedAuthContext');
    const { WMSProvider } = require('@/contexts/WMSContext');
    const { FinanceiroProvider } = require('@/contexts/FinanceiroContext');
    const OptimizedRealtimeProvider = require('@/providers/OptimizedRealtimeProvider').default;
    return (
      <SimplifiedAuthProvider>
        <WMSProvider>
          <FinanceiroProvider>
            <OptimizedRealtimeProvider>
              <div className="text-green-600">✅ RealtimeProvider loaded successfully</div>
            </OptimizedRealtimeProvider>
          </FinanceiroProvider>
        </WMSProvider>
      </SimplifiedAuthProvider>
    );
  } catch (error) {
    return <div className="text-red-600">❌ RealtimeProvider failed: {String(error)}</div>;
  }
}

function CompleteTest() {
  try {
    const App = require('@/App').default;
    return <App />;
  } catch (error) {
    return <div className="text-red-600">❌ Complete App failed: {String(error)}</div>;
  }
}

// Simple QueryClient for testing
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root not found');
}

const root = createRoot(container);
root.render(
  <QueryClientProvider client={queryClient}>
    <ProgressiveApp />
  </QueryClientProvider>
);

console.log('✅ Progressive test system loaded');