import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WMSProvider } from "@/contexts/WMSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import NotFound from "./pages/NotFound";

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

  if (user && !allowedRoles.includes(user.role || user.type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WMSProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/system-admin" element={<SystemAdminLogin />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WMSProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
