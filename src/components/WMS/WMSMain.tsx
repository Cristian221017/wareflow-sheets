import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginPage } from '@/components/Auth/LoginPage';

export function WMSLayout() {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🚀 WMSMain - Redirecting user:', { role: user.role, type: user.type, email: user.email });
      
      // Redirect based on user role/type
      if (user.role === 'super_admin') {
        console.log('🔄 Redirecting to /admin');
        navigate('/admin', { replace: true });
      } else if (user.role === 'admin_transportadora' || user.role === 'operador') {
        console.log('🔄 Redirecting to /transportadora');
        navigate('/transportadora', { replace: true });
      } else if (user.type === 'cliente' || !user.role) {
        console.log('🔄 Redirecting to /cliente');
        navigate('/cliente', { replace: true });
      } else {
        console.log('🔄 Redirecting to /transportadora (fallback)');
        navigate('/transportadora', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

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

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}