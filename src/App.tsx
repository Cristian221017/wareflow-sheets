import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WMSProvider } from "@/contexts/WMSContext";
import { SimplifiedAuthProvider, useAuth } from "@/contexts/SimplifiedAuthContext";
import { FinanceiroProvider } from "@/contexts/FinanceiroContext";
import EnvBanner from "@/components/system/EnvBanner";
import { log } from '@/utils/productionOptimizedLogger';
import { superLogger } from '@/utils/superDebugLogger';
import Index from "./pages/Index";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DebugFluxoNFs from "./pages/DebugFluxoNFs";
import HealthPage from "./pages/HealthPage";
import MercadoriasEmbarcadas from "@/pages/MercadoriasEmbarcadas";
import MercadoriasEntregues from "@/pages/MercadoriasEntregues";
import DiagnosticPage from "@/components/system/DiagnosticPage";
import SystemStatus from "@/components/system/SystemStatus";
import DebugLogViewer from "@/components/system/DebugLogViewer";
import { AuthRefreshButton } from "@/components/system/AuthRefreshButton";
import React from 'react';
import OptimizedRealtimeProvider from "@/providers/OptimizedRealtimeProvider";
import { ErrorBoundary, RouteErrorBoundary } from "@/components/ErrorBoundary";

superLogger.log('APP_COMPONENT', 'START', 'App component starting');

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  superLogger.log('PROTECTED_ROUTE', 'START', { allowedRoles });
  
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    superLogger.log('PROTECTED_ROUTE', 'SUCCESS', 'Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    superLogger.log('PROTECTED_ROUTE', 'SUCCESS', 'Redirecting to login - not authenticated');
    // Só logar se não for retry ou loop de redirecionamento
    if (!sessionStorage.getItem('auth-redirect-logged')) {
      log('❌ Not authenticated, redirecting to /');
      sessionStorage.setItem('auth-redirect-logged', 'true');
      setTimeout(() => sessionStorage.removeItem('auth-redirect-logged'), 5000);
    }
    return <Navigate to="/" replace />;
  }

  // Check access based on user role/type
  const hasAccess = (() => {
    if (!user) return false;
    
    // For cliente route - check if user is a client
    if (allowedRoles.includes('cliente')) {
      return user.type === 'cliente';
    }
    
    // For admin/transportadora routes - check if user has the required role
    return user.role && allowedRoles.includes(user.role);
  })();

  if (!hasAccess) {
    superLogger.log('PROTECTED_ROUTE', 'SUCCESS', 'Redirecting to login - access denied');
    // Só logar se não for retry
    if (!sessionStorage.getItem('access-denied-logged')) {
      log('❌ Access denied, redirecting to /');
      sessionStorage.setItem('access-denied-logged', 'true');
      setTimeout(() => sessionStorage.removeItem('access-denied-logged'), 5000);
    }
    return <Navigate to="/" replace />;
  }

  superLogger.log('PROTECTED_ROUTE', 'SUCCESS', 'Access granted');
  return <>{children}</>;
}

function App() {
  superLogger.log('APP_RENDER', 'START', 'Starting App render');
  
  try {
    return (
      <ErrorBoundary>  
        {/* TooltipProvider temporariamente desabilitado */}
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <SimplifiedAuthProvider>
            <WMSProvider>
              <FinanceiroProvider>
                <OptimizedRealtimeProvider>
                  <div className="min-h-screen bg-background">
                    <EnvBanner />
                    <AuthRefreshButton />
                    <Sonner />
                    
                    <RouteErrorBoundary>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/health" element={<HealthPage />} />
                        <Route path="/system-admin" element={<SystemAdminLogin />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        
                        <Route 
                          path="/admin" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                              <SuperAdminPortal />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/transportadora" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin', 'admin_transportadora', 'operador']}>
                              <TransportadoraPortal />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/cliente" 
                          element={
                            <ProtectedRoute allowedRoles={['cliente', 'super_admin', 'admin_transportadora', 'operador']}>
                              <ClientePortal />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/mercadorias-embarcadas" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin', 'admin_transportadora', 'operador', 'cliente']}>
                              <MercadoriasEmbarcadas />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/mercadorias-entregues" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin', 'admin_transportadora', 'operador', 'cliente']}>
                              <MercadoriasEntregues />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/debug-fluxo" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                              <DebugFluxoNFs />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/diagnostic" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                              <DiagnosticPage />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/debug-logs" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                              <DebugLogViewer />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route 
                          path="/system-status" 
                          element={
                            <ProtectedRoute allowedRoles={['super_admin']}>
                              <SystemStatus />
                            </ProtectedRoute>
                          } 
                        />
                        
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </RouteErrorBoundary>
                  </div>
                </OptimizedRealtimeProvider>
              </FinanceiroProvider>
            </WMSProvider>
          </SimplifiedAuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    );
  } catch (error) {
    superLogger.log('APP_RENDER', 'ERROR', null, error);
    throw error;
  }
}

superLogger.log('APP_COMPONENT', 'SUCCESS', 'App component defined');

export default App;