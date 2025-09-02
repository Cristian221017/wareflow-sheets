import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimplifiedAuthProvider, useAuth } from "@/contexts/SimplifiedAuthContext";
import { LoginPage } from "@/components/Auth/LoginPage";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import React from 'react';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const hasAccess = (() => {
    if (!user) return false;
    
    if (allowedRoles.includes('cliente')) {
      return user.type === 'cliente';
    }
    
    return user.role && allowedRoles.includes(user.role);
  })();

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Simple index component
function Index() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground text-lg">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Auto-redirect based on user type
  if (user?.role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  } else if (user?.type === 'cliente') {
    return <Navigate to="/cliente" replace />;
  } else if (user?.role === 'admin_transportadora' || user?.role === 'operador') {
    return <Navigate to="/transportadora" replace />;
  } else {
    return <Navigate to="/cliente" replace />;
  }
}

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <SimplifiedAuthProvider>
          <div className="min-h-screen bg-background">
            <Sonner />
            
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
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </SimplifiedAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;