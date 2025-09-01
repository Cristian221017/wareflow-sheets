import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WMSProvider } from "@/contexts/WMSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceiroProvider } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import EnvBanner from "@/components/system/EnvBanner";
import { log } from "@/utils/logger";
import Index from "./pages/Index";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DebugFluxoNFs from "./pages/DebugFluxoNFs";
import HealthPage from "./pages/HealthPage";
import DiagnosticPage from "@/components/system/DiagnosticPage";
import { AuthRefreshButton } from "@/components/system/AuthRefreshButton";
import React from 'react';
import RealtimeProvider from "@/providers/RealtimeProvider";
import OptimizedRealtimeProvider from "@/providers/OptimizedRealtimeProvider";
import { ErrorBoundary, RouteErrorBoundary } from "@/components/ErrorBoundary";

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, isAuthenticated, loading } = useAuth();

  // Se está carregando E não tem usuário (primeiro carregamento)
  if (loading && !user) {
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
    log('❌ Not authenticated, redirecting to /');
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

  log('🔒 ProtectedRoute Check:', {
    user: user?.email,
    userRole: user?.role,
    userType: user?.type,
    allowedRoles,
    hasAccess,
    loading
  });

  if (!hasAccess) {
    log('❌ Access denied, redirecting to /');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>  
      <TooltipProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AuthProvider>
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
                      path="/admin/diagnostic" 
                      element={
                        <ProtectedRoute allowedRoles={['super_admin']}>
                          <DiagnosticPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/transportadora" 
                      element={
                        <ProtectedRoute allowedRoles={['admin_transportadora', 'operador']}>
                          <TransportadoraPortal />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/transportadora/diagnostic" 
                      element={
                        <ProtectedRoute allowedRoles={['admin_transportadora', 'operador']}>
                          <DiagnosticPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/cliente" 
                      element={
                        <ProtectedRoute allowedRoles={['cliente']}>
                          <ClientePortal />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/debug/fluxo-nfs" element={<DebugFluxoNFs />} />
                    <Route path="*" element={<NotFound />} />
                      </Routes>
                    </RouteErrorBoundary>
                  </div>
                </OptimizedRealtimeProvider>
              </FinanceiroProvider>
            </WMSProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;