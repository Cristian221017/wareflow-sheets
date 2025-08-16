import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/Auth/LoginPage';
import { TransportadoraLayout } from './TransportadoraLayout';
import { ClienteLayout } from './ClienteLayout';

export function WMSLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user?.type === 'cliente') {
    return <ClienteLayout />;
  }

  return <TransportadoraLayout />;
}