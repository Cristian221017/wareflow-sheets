import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimplifiedAuthProvider, useAuth } from "@/contexts/SimplifiedAuthContext";
import Index from "./pages/Index";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import TransportadoraPortal from "./pages/TransportadoraPortal";
import ClientePortal from "./pages/ClientePortal";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import MercadoriasEmbarcadas from "@/pages/MercadoriasEmbarcadas";
import MercadoriasEntregues from "@/pages/MercadoriasEntregues";
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
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </SimplifiedAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;