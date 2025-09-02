import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

// Simple and clean initialization
console.log('🚀 Starting WMS System...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element with id="root" not found in DOM');
}

const root = createRoot(container);

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

console.log('✅ WMS System loaded successfully');