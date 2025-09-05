import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WMSProvider } from "@/contexts/WMSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceiroProvider } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { log } from "@/utils/logger";
import Index from "./pages/Index";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import HealthPage from "./pages/HealthPage";
import MercadoriasEmbarcadas from "@/pages/MercadoriasEmbarcadas";
import MercadoriasEntregues from "@/pages/MercadoriasEntregues";
import React from 'react';
import RealtimeProvider from "@/providers/RealtimeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorLoopDetector } from "@/components/system/ErrorLoopDetector";
import { DiagnosticPage } from "@/components/system/DiagnosticPage";
import { SystemHealthDashboard } from "@/components/system/SystemHealthDashboard";
import { ApiStatusIndicator } from "@/components/system/ApiStatusIndicator";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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

  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Se está carregando MAS tem usuário (refresh de token/perfil), não redirecionar
  if (loading && user) {
    log('⏳ User profile refreshing, maintaining current route');
    return <>{children}</>;
  }

  // Check access based on user role/type
  const hasAccess = (() => {
    if (!user) return false;
    
    // Super admins can access everything
    if (user.role === 'super_admin') {
      return true;
    }
    
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

  if (!hasAccess && !loading) {  // Só redirecionar se NÃO estiver carregando
    log('❌ Access denied, redirecting to /');
    return <Navigate to="/" replace />;
  }

  // Se não tem acesso mas está carregando, aguardar
  if (!hasAccess && loading) {
    log('⏳ Waiting for auth state to stabilize');
    return <>{children}</>;
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
                <RealtimeProvider>
                   <div className="min-h-screen bg-background">
                     <Sonner />
                     <ErrorLoopDetector />
                     
                     <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/health" element={<HealthPage />} />
                      <Route path="/diagnostic" element={<DiagnosticPage />} />
                      <Route path="/system-health" element={<SystemHealthDashboard />} />
                      
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
                          <ProtectedRoute allowedRoles={['admin_transportadora', 'operador']}>
                            <TransportadoraPortal />
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
          
                      <Route 
                        path="/transportadora/embarques" 
                        element={
                          <ProtectedRoute allowedRoles={['admin_transportadora', 'operador']}>
                            <MercadoriasEmbarcadas />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/transportadora/entregas" 
                        element={
                          <ProtectedRoute allowedRoles={['admin_transportadora', 'operador']}>
                            <MercadoriasEntregues />
                          </ProtectedRoute>
                        } 
                       />
                       
                       <Route path="/health" element={<HealthPage />} />
                       <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </RealtimeProvider>
              </FinanceiroProvider>
            </WMSProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;