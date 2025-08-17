import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/Auth/LoginPage';
import { TransportadoraLayout } from './TransportadoraLayout';
import { ClienteLayout } from './ClienteLayout';
import { SuperAdminLayout } from './SuperAdminLayout';

export function WMSLayout() {
  const { isAuthenticated, user, loading } = useAuth();

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
    return <LoginPage />;
  }

  // Check for super admin role
  if (user?.role === 'super_admin') {
    return <SuperAdminLayout />;
  }

  if (user?.type === 'cliente') {
    return <ClienteLayout />;
  }

  return <TransportadoraLayout />;
}