import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WMSProvider } from "@/contexts/WMSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceiroProvider } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DebugFluxoNFs from "./pages/DebugFluxoNFs";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
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
    return <Navigate to="/" replace />;
  }

  // For client route, check if user has no role (meaning it's a client)
  // For other routes, check if user has the required role
  const hasAccess = allowedRoles.includes('cliente') 
    ? (!user?.role || user?.role === 'cliente') 
    : allowedRoles.includes(user?.role || '');
    
  if (user && !hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WMSProvider>
        <FinanceiroProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
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
            <Route path="/debug/fluxo-nfs" element={<DebugFluxoNFs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </TooltipProvider>
        </FinanceiroProvider>
      </WMSProvider>
    </AuthProvider>
</QueryClientProvider>
);

export default App;
